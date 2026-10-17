"""Meeetly World News Aggregator & API Worker.
Aggregates news from NewsAPI and multiple reputable global publishers
across departments and subcategories (World, Technology, Business, Science, Sports, Entertainment).
Enforces source diversity, deduplication, 24-hour expiry, on-demand server-side content extraction,
and SQLite caching.
"""
import asyncio
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
import email.utils
from hashlib import sha256
from html.parser import HTMLParser
import html
import logging
import os
from pathlib import Path
import re
import sqlite3
import time
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

import httpx
import lxml.html
from fastapi import FastAPI, HTTPException

from departments import (
    DEPARTMENTS,
    get_departments_metadata,
    get_department_config,
    get_subcategory_config
)

DAY = 86400
HOUR = 3600
DB_PATH = Path(__file__).resolve().parents[2] / 'data' / 'events.db'
LICENSE = 'https://creativecommons.org/licenses/by/3.0/'
API = 'https://globalvoices.org/wp-json/wp/v2/posts'
log = logging.getLogger('news')

# Default Top 20 Global News feeds
FEEDS = [
    ('BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'World'),
    ('The Guardian', 'https://www.theguardian.com/world/rss', 'World'),
    ('NPR World', 'https://feeds.npr.org/1004/rss.xml', 'World'),
    ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'World'),
    ('France 24', 'https://www.france24.com/en/rss', 'World'),
    ('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362', 'Business'),
    ('TechCrunch', 'https://techcrunch.com/feed/', 'Technology'),
    ('Global Voices', 'https://globalvoices.org/feed/', 'World'),
]

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        if tag in ('p', 'div', 'h2', 'h3', 'li', 'br') and not self.skip:
            self.parts.append('\n\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.skip:
            self.skip -= 1
        if tag in ('p', 'li') and not self.skip:
            self.parts.append('\n\n')

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

def text(value):
    parser = TextParser()
    parser.feed(str(value or ''))
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[ \t]+', ' ', html.unescape(''.join(parser.parts)))).strip()

def safe_url(value):
    try:
        url = urlparse(str(value or ''))
        return str(value) if url.scheme in ('http', 'https') and url.hostname and not url.username and not url.password else ''
    except ValueError:
        return ''

def timestamp(value):
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value or '').strip()
    if not s:
        return 0.0
    try:
        dt = email.utils.parsedate_to_datetime(s)
        return dt.timestamp()
    except Exception:
        pass
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).replace(tzinfo=timezone.utc).timestamp()
    except Exception:
        return 0.0

def iso(value):
    return datetime.fromtimestamp(value, timezone.utc).isoformat().replace('+00:00', 'Z')

def map_posts(posts):
    items = []
    for post in posts:
        url = safe_url(post.get('link'))
        if urlparse(url).hostname != 'globalvoices.org':
            continue
        embedded = post.get('_embedded', {})
        authors = embedded.get('author', [])
        media = embedded.get('wp:featuredmedia', [])
        image_url = safe_url(media[0].get('source_url', '')) if media and isinstance(media, list) and isinstance(media[0], dict) else ''
        categories = [term.get('name', '') for group in embedded.get('wp:term', []) for term in group if term.get('taxonomy') == 'category']
        body = text(post.get('content', {}).get('rendered'))
        description = text(post.get('excerpt', {}).get('rendered'))
        category = next((c for c in categories if c in ('Politics', 'Technology', 'Economics & Business', 'Science', 'War & Conflict', 'Human Rights', 'International Relations')), 'World')
        items.append(dict(
            title=text(post.get('title', {}).get('rendered')),
            description=description,
            content=body,
            source_name='Global Voices',
            author=post.get('attribution_author') or ', '.join(a.get('name', '') for a in authors),
            article_url=url,
            category=category,
            published_at=str(post.get('date_gmt', '')) + 'Z',
            license_url=LICENSE,
            image_url=image_url,
            content_status='provider_content' if len(body) > 300 else 'available',
            content_source='provider'
        ))
    return items

STOP = {'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'after', 'as', 'is', 'at', 'by', 'from'}
def story_tokens(title):
    return set(re.findall(r'\w+', (title or '').lower())) - STOP

def select_news(items, now, max_per_pub=3, window_days=1):
    valid, hashes, urls, stories = [], set(), set(), []
    for item in items:
        title = text(item.get('title'))
        url = safe_url(item.get('article_url'))
        published = timestamp(item.get('published_at'))
        source_name = text(item.get('source_name'))
        if not title or not url or not source_name:
            continue
        # 24-hour expiry check
        if not (now - DAY * window_days < published <= now + 600):
            continue

        key = sha256(re.sub(r'[^\w]', '', title.lower()).encode()).hexdigest()
        tokens = story_tokens(title)
        if key in hashes or url in urls or any(len(tokens & old) / max(1, len(tokens | old)) >= 0.65 for old in stories):
            continue
        hashes.add(key)
        urls.add(url)
        stories.append(tokens)
        cat = str(item.get('category', 'World'))
        prio = 4 if any(k in cat.lower() for k in ('politic', 'tech', 'business', 'science', 'war', 'conflict', 'breaking', 'sport', 'cricket', 'football', 'tennis')) else 2
        rank = prio + (1.0 if item.get('image_url') else 0.0)
        exp = published + DAY
        if exp <= now:
            exp = now + DAY
        valid.append({
            **item,
            'title': title,
            'article_url': url,
            'source_name': source_name,
            'id': sha256(url.encode()).hexdigest()[:24],
            'dedupe_hash': key,
            'published_at': published,
            'expires_at': exp,
            'rank': rank,
            'image_url': safe_url(item.get('image_url', '')),
            'description': text(item.get('description', '')),
            'content': item.get('content') or text(item.get('description', '')),
            'category': cat,
            'author': text(item.get('author', '')) or source_name,
            'content_status': item.get('content_status', 'provider_content'),
            'content_source': item.get('content_source', 'provider'),
            'content_fetched_at': item.get('content_fetched_at', 0)
        })

    candidates = sorted(valid, key=lambda a: (a['rank'], a['published_at']), reverse=True)

    # Source diversity: max_per_pub articles per publisher in Top 20
    selected, pub_counts, deferred = [], {}, []
    for a in candidates:
        p = a['source_name']
        c = pub_counts.get(p, 0)
        if c < max_per_pub:
            selected.append(a)
            pub_counts[p] = c + 1
            if len(selected) == 20:
                break
        else:
            deferred.append(a)

    # Fill remaining slots up to 20 from deferred if fewer distinct publishers
    if len(selected) < 20 and deferred:
        for a in deferred:
            selected.append(a)
            if len(selected) == 20:
                break

    return selected

class NewsStore:
    def __init__(self, path=DB_PATH):
        self.path = path
        with self.connect() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS world_news (
              id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
              image_url TEXT NOT NULL DEFAULT '', source_name TEXT NOT NULL, article_url TEXT NOT NULL UNIQUE,
              category TEXT NOT NULL, published_at REAL NOT NULL, created_at REAL NOT NULL,
              expires_at REAL NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, dedupe_hash TEXT NOT NULL UNIQUE,
              author TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', license_url TEXT NOT NULL DEFAULT '', rank REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS world_news_active_expiry ON world_news(is_active, expires_at);
            CREATE TABLE IF NOT EXISTS world_news_state (id INTEGER PRIMARY KEY CHECK(id=1), updated_at REAL, last_attempt REAL, failed INTEGER NOT NULL DEFAULT 0);
            INSERT OR IGNORE INTO world_news_state(id,failed) VALUES(1,0);
            CREATE TABLE IF NOT EXISTS category_news_state (
              key TEXT PRIMARY KEY,
              updated_at REAL,
              last_attempt REAL,
              failed INTEGER NOT NULL DEFAULT 0
            );
            ''')
            # Safe schema migrations for existing tables
            cols = [r['name'] for r in db.execute("PRAGMA table_info(world_news)").fetchall()]
            if 'content_status' not in cols:
                try: db.execute("ALTER TABLE world_news ADD COLUMN content_status TEXT NOT NULL DEFAULT 'provider_content'")
                except Exception: pass
            if 'content_source' not in cols:
                try: db.execute("ALTER TABLE world_news ADD COLUMN content_source TEXT NOT NULL DEFAULT 'provider'")
                except Exception: pass
            if 'content_fetched_at' not in cols:
                try: db.execute("ALTER TABLE world_news ADD COLUMN content_fetched_at REAL NOT NULL DEFAULT 0")
                except Exception: pass
            if 'department' not in cols:
                try: db.execute("ALTER TABLE world_news ADD COLUMN department TEXT NOT NULL DEFAULT 'world'")
                except Exception: pass
            if 'subcategory' not in cols:
                try: db.execute("ALTER TABLE world_news ADD COLUMN subcategory TEXT NOT NULL DEFAULT 'general'")
                except Exception: pass
            
            # Now create index with guaranteed columns
            try:
                db.execute("CREATE INDEX IF NOT EXISTS world_news_dept_subcat ON world_news(department, subcategory, is_active, expires_at);")
            except Exception:
                pass


    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def expire(self, now):
        with self.connect() as db:
            db.execute('DELETE FROM world_news WHERE expires_at<=?', (now,))

    def due(self, now):
        with self.connect() as db:
            state = db.execute('SELECT * FROM world_news_state WHERE id=1').fetchone()
        return not state['last_attempt'] or now - state['last_attempt'] >= (900 if state['failed'] else HOUR)

    def category_due(self, department, subcategory, now):
        key = f"{department}:{subcategory}"
        with self.connect() as db:
            state = db.execute('SELECT * FROM category_news_state WHERE key=?', (key,)).fetchone()
        if not state or not state['last_attempt']:
            return True
        return now - state['last_attempt'] >= (900 if state['failed'] else HOUR)

    def save(self, articles, now, department='world', subcategory='general'):
        with self.connect() as db:
            # Delete general feed or specific category
            db.execute('DELETE FROM world_news WHERE department=? AND subcategory=?', (department, subcategory))
            for item in articles:
                db.execute('''
                INSERT OR REPLACE INTO world_news (
                  id, title, description, image_url, source_name, article_url, category,
                  published_at, created_at, expires_at, is_active, dedupe_hash, author,
                  content, license_url, rank, content_status, content_source, content_fetched_at,
                  department, subcategory
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)

                ''', (
                    item['id'], item['title'], item['description'], item['image_url'], item['source_name'], item['article_url'], item['category'],
                    item['published_at'], now, item['expires_at'], 1, item['dedupe_hash'], item.get('author', ''), item.get('content', ''), item.get('license_url', ''), item['rank'],
                    item.get('content_status', 'provider_content'), item.get('content_source', 'provider'), item.get('content_fetched_at', 0),
                    department, subcategory
                ))
            if department == 'world' and subcategory == 'general':
                db.execute('UPDATE world_news_state SET updated_at=?,last_attempt=?,failed=0 WHERE id=1', (now, now))
            else:
                key = f"{department}:{subcategory}"
                db.execute('''
                INSERT INTO category_news_state (key, updated_at, last_attempt, failed)
                VALUES (?, ?, ?, 0)
                ON CONFLICT(key) DO UPDATE SET updated_at=?, last_attempt=?, failed=0
                ''', (key, now, now, now, now))

    def update_content(self, article_id, content, content_status, content_source, now):
        with self.connect() as db:
            db.execute('''
            UPDATE world_news
            SET content = ?, content_status = ?, content_source = ?, content_fetched_at = ?
            WHERE id = ?
            ''', (content, content_status, content_source, now, article_id))

    def failure(self, now, department='world', subcategory='general'):
        with self.connect() as db:
            if department == 'world' and subcategory == 'general':
                db.execute('UPDATE world_news_state SET last_attempt=?,failed=1 WHERE id=1', (now,))
            else:
                key = f"{department}:{subcategory}"
                db.execute('''
                INSERT INTO category_news_state (key, last_attempt, failed)
                VALUES (?, ?, 1)
                ON CONFLICT(key) DO UPDATE SET last_attempt=?, failed=1
                ''', (key, now, now))

    def read(self, now, article_id=None, department=None, subcategory=None):
        self.expire(now)
        with self.connect() as db:
            if article_id:
                query = 'SELECT * FROM world_news WHERE is_active=1 AND expires_at>? AND id=?'
                params = [now, article_id]
                rows = db.execute(query, params).fetchall()
                state = None
            elif department and subcategory:
                key = f"{department}:{subcategory}"
                state = db.execute('SELECT * FROM category_news_state WHERE key=?', (key,)).fetchone()
                query = '''SELECT * FROM world_news 
                           WHERE is_active=1 AND expires_at>? AND department=? AND subcategory=?
                           ORDER BY rank DESC, published_at DESC LIMIT 20'''
                params = [now, department, subcategory]
                rows = db.execute(query, params).fetchall()
            else:
                state = db.execute('SELECT * FROM world_news_state WHERE id=1').fetchone()
                query = '''SELECT * FROM world_news 
                           WHERE is_active=1 AND expires_at>? AND department='world' AND subcategory='general'
                           ORDER BY rank DESC, published_at DESC LIMIT 20'''
                params = [now]
                rows = db.execute(query, params).fetchall()
                # Fallback to any active news if general feed empty
                if not rows:
                    query = '''SELECT * FROM world_news 
                               WHERE is_active=1 AND expires_at>?
                               ORDER BY rank DESC, published_at DESC LIMIT 20'''
                    rows = db.execute(query, [now]).fetchall()

        articles = [dict(
            id=r['id'], title=r['title'], summary=r['description'], description=r['description'], imageUrl=r['image_url'],
            source=r['source_name'], url=r['article_url'], articleUrl=r['article_url'], category=r['category'], author=r['author'],
            department=r['department'] if 'department' in r.keys() else 'world',
            subcategory=r['subcategory'] if 'subcategory' in r.keys() else 'general',
            publishedAt=iso(r['published_at']), createdAt=iso(r['created_at']), expiresAt=iso(r['expires_at']), licenseUrl=r['license_url'],
            **({
                'content': r['content'],
                'contentStatus': r['content_status'] if 'content_status' in r.keys() else 'available',
                'contentSource': r['content_source'] if 'content_source' in r.keys() else 'provider',
                'contentFetchedAt': iso(r['content_fetched_at']) if ('content_fetched_at' in r.keys() and r['content_fetched_at']) else None
            } if article_id else {})
        ) for r in rows]

        return dict(
            articles=articles,
            total=len(articles),
            department=department,
            subcategory=subcategory,
            status='unavailable' if (state and state['failed']) else 'ready',
            stale=bool(state and state['failed']),
            updatedAt=iso(state['updated_at']) if (state and state['updated_at']) else None,
            nextUpdateAt=iso(state['last_attempt'] + (900 if state['failed'] else HOUR)) if (state and state['last_attempt']) else None
        )

def extract_image_from_xml(item):
    for tag in item.findall('{http://search.yahoo.com/mrss/}content'):
        url = tag.get('url')
        if url and any(ext in url.lower() for ext in ('.jpg', '.jpeg', '.png', '.webp')):
            return safe_url(url)
    for tag in item.findall('{http://search.yahoo.com/mrss/}thumbnail'):
        url = tag.get('url')
        if url:
            return safe_url(url)
    for tag in item.findall('enclosure'):
        url = tag.get('url')
        if url and 'image' in (tag.get('type') or ''):
            return safe_url(url)
    desc = item.findtext('description') or ''
    m = re.search(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', desc)
    if m:
        return safe_url(m.group(1))
    return ''

def fetch_rss_feeds():
    articles = []
    with httpx.Client(timeout=10, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}) as client:
        for source_name, feed_url, default_cat in FEEDS:
            try:
                res = client.get(feed_url)
                root = ET.fromstring(res.text)
                for item in root.findall('.//item'):
                    t = text(item.findtext('title'))
                    link = safe_url(item.findtext('link'))
                    desc = text(item.findtext('description'))
                    pub_str = item.findtext('pubDate') or item.findtext('{http://purl.org/dc/elements/1.1/}date') or ''
                    pub_ts = timestamp(pub_str)
                    img = extract_image_from_xml(item)
                    author = text(item.findtext('{http://purl.org/dc/elements/1.1/}creator')) or source_name

                    cat = default_cat
                    for c in item.findall('category'):
                        c_txt = (c.text or '').lower()
                        if any(k in c_txt for k in ('politic', 'government', 'election')):
                            cat = 'Politics'
                            break
                        elif any(k in c_txt for k in ('tech', 'cyber', 'software', 'ai')):
                            cat = 'Technology'
                            break
                        elif any(k in c_txt for k in ('business', 'economy', 'market', 'trade')):
                            cat = 'Business'
                            break
                        elif any(k in c_txt for k in ('science', 'space', 'climate', 'health')):
                            cat = 'Science'
                            break

                    if t and link:
                        articles.append({
                            'title': t,
                            'description': desc,
                            'content': desc,
                            'source_name': source_name,
                            'author': author,
                            'article_url': link,
                            'category': cat,
                            'published_at': pub_ts,
                            'image_url': img,
                            'license_url': link,
                            'content_status': 'provider_content',
                            'content_source': 'provider'
                        })
            except Exception as e:
                log.warning('RSS feed failed for %s: %s', source_name, e)
    return articles

def fetch_from_newsapi(api_key):
    items = []
    with httpx.Client(timeout=12, headers={'User-Agent': 'MeeetlyNews/1.0'}) as client:
        url = 'https://newsapi.org/v2/top-headlines'
        params = {'language': 'en', 'pageSize': 100, 'apiKey': api_key}
        res = client.get(url, params=params)
        res.raise_for_status()
        data = res.json()
        for a in data.get('articles', []):
            u = safe_url(a.get('url'))
            t = text(a.get('title'))
            if not u or not t or '[removed]' in t.lower():
                continue
            src_name = (a.get('source') or {}).get('name') or 'World News'
            desc = text(a.get('description'))
            cnt = text(a.get('content') or a.get('description'))
            t_lower = (t + ' ' + desc).lower()
            cat = 'World'
            if any(k in t_lower for k in ('tech', 'cyber', 'software', 'ai', 'google', 'apple', 'microsoft')):
                cat = 'Technology'
            elif any(k in t_lower for k in ('politic', 'election', 'senate', 'parliament', 'minister', 'president')):
                cat = 'Politics'
            elif any(k in t_lower for k in ('business', 'economy', 'stock', 'market', 'inflation', 'revenue')):
                cat = 'Business'
            elif any(k in t_lower for k in ('science', 'space', 'climate', 'health', 'study', 'research')):
                cat = 'Science'

            items.append({
                'title': t,
                'description': desc,
                'content': cnt,
                'source_name': src_name,
                'author': text(a.get('author')) or src_name,
                'article_url': u,
                'category': cat,
                'published_at': a.get('publishedAt') or '',
                'license_url': u,
                'image_url': safe_url(a.get('urlToImage', '')),
                'content_status': 'provider_content',
                'content_source': 'newsapi'
            })
    return items

def fetch_global_voices_api():
    with httpx.Client(timeout=20, headers={'User-Agent': 'MeeetlyNews/1.0 (Global Voices news reader)'}) as client:
        response = client.get(API, params={'per_page': 100, 'after': iso(time.time() - DAY), 'orderby': 'date', 'order': 'desc', '_embed': '1'})
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, list):
            raise ValueError('Invalid news response')
        credits_response = client.get('https://globalvoices.org/feed/')
        credits_response.raise_for_status()
        root = ET.fromstring(credits_response.text)
        credits = {item.findtext('link'): item.findtext('{http://purl.org/dc/elements/1.1/}creator', '') for item in root.findall('./channel/item')}
        for post in data:
            post['attribution_author'] = credits.get(post.get('link'), '')
        return [item for item in map_posts(data) if item['author']]

def fetch_posts():
    items = []
    api_key = os.getenv('NEWS_API_KEY', '').strip()
    if api_key:
        try:
            api_items = fetch_from_newsapi(api_key)
            if api_items:
                log.info('Fetched %d articles from NewsAPI', len(api_items))
                items.extend(api_items)
        except Exception as e:
            log.warning('External NEWS_API_KEY provider failed: %s', e)

    # Multi-source RSS aggregation from reputable publishers
    try:
        rss_items = fetch_rss_feeds()
        if rss_items:
            items.extend(rss_items)
    except Exception as e:
        log.warning('RSS feeds fetch failed: %s', e)

    # Fallback to Global Voices API if no items yet
    if not items:
        try:
            gv_items = fetch_global_voices_api()
            items.extend(gv_items)
        except Exception as e:
            log.warning('Global Voices fallback failed: %s', e)

    return items

def fetch_category_articles(department: str, subcategory: str, now: float):
    """Fetches articles for a specific department and subcategory from configured multi-source feeds."""
    subcat_config = get_subcategory_config(department, subcategory)
    if not subcat_config:
        return []

    dept_config = get_department_config(department)
    dept_name = dept_config['name'] if dept_config else department.title()
    subcat_name = subcat_config['name']

    raw_items = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    with httpx.Client(timeout=10, headers=headers) as client:
        for source_name, feed_url in subcat_config.get('feeds', []):
            try:
                res = client.get(feed_url, follow_redirects=True)
                if res.status_code != 200:
                    continue
                root = ET.fromstring(res.text)
                for item in root.findall('.//item'):
                    t = text(item.findtext('title'))
                    link = safe_url(item.findtext('link'))
                    desc = text(item.findtext('description'))
                    pub_str = item.findtext('pubDate') or item.findtext('{http://purl.org/dc/elements/1.1/}date') or ''
                    pub_ts = timestamp(pub_str) or (now - 3600)
                    img = extract_image_from_xml(item)
                    # Extract publisher source name from item or feed default
                    src_tag = item.findtext('source')
                    pub_name = text(src_tag) if src_tag else source_name
                    author = text(item.findtext('{http://purl.org/dc/elements/1.1/}creator')) or pub_name

                    if t and link:
                        raw_items.append({
                            'title': t,
                            'description': desc,
                            'content': desc,
                            'source_name': pub_name,
                            'author': author,
                            'article_url': link,
                            'category': subcat_name,
                            'published_at': pub_ts,
                            'image_url': img,
                            'license_url': link,
                            'department': department,
                            'subcategory': subcategory
                        })
            except Exception as e:
                log.debug('Category feed error (%s / %s -> %s): %s', department, subcategory, source_name, e)

    selected = select_news(raw_items, now, max_per_pub=3, window_days=4)

    # If fewer than 20 items found, supplement via Google News RSS search
    query = subcat_config.get('query')
    if len(selected) < 20 and query:
        try:
            with httpx.Client(timeout=8, headers=headers) as client:
                gnews_url = f'https://news.google.com/rss/search?q={query.replace(" ", "+")}&hl=en-US&gl=US&ceid=US:en'
                res = client.get(gnews_url, follow_redirects=True)
                if res.status_code == 200:
                    root = ET.fromstring(res.text)
                    for item in root.findall('.//item'):
                        t = text(item.findtext('title'))
                        link = safe_url(item.findtext('link'))
                        pub_str = item.findtext('pubDate') or ''
                        pub_ts = timestamp(pub_str) or (now - 3600)
                        src_name = text(item.findtext('source')) or dept_name
                        desc = text(item.findtext('description'))
                        if t and link:
                            raw_items.append({
                                'title': t,
                                'description': desc,
                                'content': desc,
                                'source_name': src_name,
                                'author': src_name,
                                'article_url': link,
                                'category': subcat_name,
                                'published_at': pub_ts,
                                'image_url': '',
                                'license_url': link,
                                'department': department,
                                'subcategory': subcategory
                            })
                    selected = select_news(raw_items, now, max_per_pub=3, window_days=7)
        except Exception as e:
            log.debug('Google news search supplement error: %s', e)

    return selected


def update_category_news(store, department: str, subcategory: str, now: float = None):
    now = time.time() if now is None else now
    try:
        articles = fetch_category_articles(department, subcategory, now)
        if articles:
            store.save(articles, now, department=department, subcategory=subcategory)
            return True
        return False
    except Exception as e:
        log.warning('Failed to update category %s/%s: %s', department, subcategory, e)
        store.failure(now, department=department, subcategory=subcategory)
        return False

def extract_article_content(url: str, source_name: str = '') -> str:
    """Safely extracts readable article body HTML from a public article URL.
    Respects access restrictions and returns clean, sanitized HTML blocks.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    }
    with httpx.Client(timeout=10, headers=headers, follow_redirects=True) as client:
        res = client.get(url)
        if res.status_code != 200:
            return ''
        html_text = res.text

    tree = lxml.html.fromstring(html_text)

    # 1. Remove dangerous and layout-only elements
    for el in tree.xpath('//script|//style|//nav|//footer|//header|//form|//aside|//noscript|//svg|//iframe|//button|//input|//select|//textarea|//meta|//link'):
        if el.getparent() is not None:
            el.getparent().remove(el)

    # 2. Remove common ads, cookie notices, newsletters, and social bars
    bad_keywords = ['cookie', 'banner', 'newsletter', 'ad-', 'advert', 'sponsor', 'social', 'share', 'comment', 'recommend', 'related', 'promo', 'signup', 'popup', 'modal']
    for el in tree.xpath('//*[contains(@class, "ad") or contains(@class, "social") or contains(@class, "share") or contains(@class, "comment") or contains(@id, "comment") or contains(@class, "newsletter")]'):
        class_id = ((el.get('class') or '') + ' ' + (el.get('id') or '')).lower()
        if any(bad in class_id for bad in bad_keywords):
            if el.tag not in ('article', 'main', 'body', 'html') and el.getparent() is not None:
                el.getparent().remove(el)

    # 3. Locate best article content container
    candidates = tree.xpath(
        '//article | //main | '
        '//div[contains(@class, "article-body") or contains(@class, "story-body") or '
        'contains(@class, "ArticleBody") or contains(@class, "wysiwyg") or '
        'contains(@class, "entry-content") or contains(@class, "content-body") or '
        'contains(@class, "article__content") or contains(@class, "story-text") or @id="storytext" or @id="main-content"]'
    )
    container = candidates[0] if candidates else tree.body
    if container is None:
        return ''

    # 4. Extract structured blocks
    blocks = []
    seen_texts = set()

    for child in container.iter():
        tag = child.tag.lower() if isinstance(child.tag, str) else ''
        if tag in ('p', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'figure'):
            if child.getparent() is not None and child.getparent().tag.lower() in ('blockquote', 'ul', 'ol', 'figure'):
                continue

            if tag in ('p', 'h2', 'h3'):
                txt = re.sub(r'\s+', ' ', child.text_content()).strip()
                if not txt or len(txt) < 15 or txt.lower() in ('read more', 'continue reading', 'advertisement', 'sign up', 'share this'):
                    continue
                if txt in seen_texts:
                    continue
                seen_texts.add(txt)
                escaped = html.escape(txt)
                if tag == 'h2':
                    blocks.append(f'<h2>{escaped}</h2>')
                elif tag == 'h3':
                    blocks.append(f'<h3>{escaped}</h3>')
                else:
                    blocks.append(f'<p>{escaped}</p>')

            elif tag == 'blockquote':
                txt = re.sub(r'\s+', ' ', child.text_content()).strip()
                if txt and txt not in seen_texts:
                    seen_texts.add(txt)
                    escaped = html.escape(txt)
                    blocks.append(f'<blockquote>{escaped}</blockquote>')

            elif tag in ('ul', 'ol'):
                lis = []
                for li in child.xpath('.//li'):
                    li_txt = re.sub(r'\s+', ' ', li.text_content()).strip()
                    if li_txt and len(li_txt) > 5 and li_txt not in seen_texts:
                        seen_texts.add(li_txt)
                        lis.append(f'<li>{html.escape(li_txt)}</li>')
                if lis:
                    tag_type = 'ol' if tag == 'ol' else 'ul'
                    blocks.append(f'<{tag_type}>{"".join(lis)}</{tag_type}>')

            elif tag == 'figure':
                img = child.xpath('.//img')
                if img:
                    src = img[0].get('src') or img[0].get('data-src') or ''
                    if src and src.startswith('http'):
                        caption_el = child.xpath('.//figcaption')
                        caption = caption_el[0].text_content().strip() if caption_el else ''
                        caption_html = f'<figcaption>{html.escape(caption)}</figcaption>' if caption else ''
                        blocks.append(f'<figure><img src="{html.escape(src)}" alt="Article visual" loading="lazy" />{caption_html}</figure>')

    return '\n'.join(blocks)

def update_news(store, fetcher=fetch_posts, now=None):
    now = time.time() if now is None else now
    store.expire(now)
    if not store.due(now):
        return False
    try:
        articles = select_news(fetcher(), now)
        store.save(articles, now, department='world', subcategory='general')
        return True
    except Exception:
        store.failure(now)
        log.warning('News provider unavailable; retaining only unexpired stories.')
        return False

@asynccontextmanager
async def lifespan(app):
    app.state.store = NewsStore()
    async def scheduler():
        while True:
            try:
                # Update general feed
                await asyncio.to_thread(update_news, app.state.store)
            except Exception:
                log.exception('News scheduler failed')
            await asyncio.sleep(60)
    task = asyncio.create_task(scheduler())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(title='Meeetly World & Department News', lifespan=lifespan)

@app.get('/health')
def health():
    return {'status': 'ready', 'service': 'meeetly-news'}

@app.get('/api/news/departments')
def departments():
    """Returns list of departments and their subcategories."""
    return {'departments': get_departments_metadata()}

@app.get('/api/news/departments/{dept_id}')
def department_detail(dept_id: str):
    dept = get_department_config(dept_id)
    if not dept:
        raise HTTPException(404, f'Department {dept_id} not found')
    subcats = [{'id': s_id, 'name': s['name']} for s_id, s in dept['subcategories'].items()]
    return {'id': dept_id, 'name': dept['name'], 'description': dept.get('description', ''), 'subcategories': subcats}

@app.get('/api/news')
def news():
    """Returns general top 20 news."""
    return app.state.store.read(time.time())

@app.get('/api/news/article/{article_id}')
async def detail_alias(article_id: str):
    return await detail(article_id)

@app.get('/api/news/{dept_id}/{subcat_id}')
def category_news(dept_id: str, subcat_id: str):
    """Returns Top 20 news for department -> subcategory."""
    now = time.time()
    store = app.state.store

    dept_config = get_department_config(dept_id)
    subcat_config = get_subcategory_config(dept_id, subcat_id)
    if not dept_config or not subcat_config:
        raise HTTPException(404, f'Subcategory {dept_id}/{subcat_id} not found')

    # Check cached articles in SQLite
    cached = store.read(now, department=dept_id, subcategory=subcat_id)
    if len(cached['articles']) < 20 or store.category_due(dept_id, subcat_id, now):
        # Fetch fresh Top 20 for this category on-demand
        success = update_category_news(store, dept_id, subcat_id, now)
        if success:
            cached = store.read(now, department=dept_id, subcategory=subcat_id)


    return {
        'department': dept_id,
        'departmentName': dept_config['name'],
        'subcategory': subcat_id,
        'subcategoryName': subcat_config['name'],
        'category': dept_config['name'],
        'articles': cached['articles'],
        'total': len(cached['articles']),
        'updatedAt': cached.get('updatedAt')
    }

@app.get('/api/news/{article_id}')
async def detail(article_id: str):
    now = time.time()
    store = app.state.store
    data = store.read(now, article_id)
    if not data['articles']:
        raise HTTPException(404, 'News article has expired or is unavailable')

    article = data['articles'][0]
    status = article.get('contentStatus', 'provider_content')
    existing_content = (article.get('content') or '').strip()

    # If already extracted or substantial full content from provider
    has_full_content = (
        status == 'extracted' or
        (len(existing_content) > 600 and '[+' not in existing_content and 'continue reading' not in existing_content.lower())
    )

    if has_full_content or status in ('failed', 'unavailable'):
        return article

    # Attempt readable article extraction on public article_url
    url = article.get('url') or article.get('articleUrl')
    if not url or not url.startswith('http'):
        return article

    try:
        extracted = await asyncio.to_thread(extract_article_content, url, article.get('source', ''))
        if extracted and len(extracted) > 250:
            store.update_content(article_id, extracted, 'extracted', 'extractor', now)
            article['content'] = extracted
            article['contentStatus'] = 'extracted'
            article['contentSource'] = 'extractor'
            article['contentFetchedAt'] = iso(now)
        else:
            fallback_status = 'provider_content' if existing_content else 'unavailable'
            store.update_content(article_id, existing_content or article.get('description', ''), fallback_status, 'provider', now)
            article['contentStatus'] = fallback_status
    except Exception as e:
        log.warning('Article extraction error for %s: %s', url, e)
        fallback_status = 'provider_content' if existing_content else 'unavailable'
        store.update_content(article_id, existing_content or article.get('description', ''), fallback_status, 'provider', now)
        article['contentStatus'] = fallback_status

    return article

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=int(os.getenv('NEWS_PORT', '5002')))
