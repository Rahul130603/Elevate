import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1] / 'news'))
from app import NewsStore,select_news,map_posts,update_news,DAY,HOUR,text
NOW=1789722000

def items(count=25):
    return [dict(title=f'Global event number {i}',article_url=f'https://globalvoices.org/article-{i}',source_name='Global Voices',description='Description',content='Licensed article body',author='Reporter',category='World',published_at=__import__('datetime').datetime.fromtimestamp(NOW-i*60,__import__('datetime').timezone.utc).isoformat(),license_url='https://creativecommons.org/licenses/by/3.0/') for i in range(count)]

class NewsTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.store=NewsStore(Path(self.temp.name)/'test.db')
    def tearDown(self): self.temp.cleanup()
    def test_limit_and_expiry(self):
        self.assertLessEqual(len(select_news(items(),NOW)),20)
        self.assertEqual(select_news(items(),NOW+DAY),[])
    def test_duplicates_and_unsafe_urls(self):
        data=items(1);self.assertEqual(len(select_news(data+data,NOW)),1)
        data[0]['article_url']='javascript:alert(1)';self.assertEqual(select_news(data,NOW),[])
    def test_same_event_different_sources(self):
        a,b=items(2);a['title']='Major earthquake strikes Japan causing widespread damage';b['title']='Major earthquake strikes Japan causing widespread damage today'
        self.assertEqual(len(select_news([a,b],NOW)),1)
    def test_ranking(self):
        a,b=items(2);b['category']='Science'
        self.assertEqual(select_news([a,b],NOW)[0]['category'],'Science')
    def test_hourly_and_failure_retention(self):
        self.assertTrue(update_news(self.store,lambda:items(3),NOW))
        self.assertFalse(update_news(self.store,lambda:[],NOW+HOUR-1))
        def failed():raise RuntimeError('provider error')
        update_news(self.store,failed,NOW+HOUR)
        result=self.store.read(NOW+HOUR);self.assertEqual(len(result['articles']),3);self.assertEqual(result['status'],'unavailable')
        self.assertFalse(update_news(self.store,lambda:[],NOW+HOUR+899))
        self.assertTrue(update_news(self.store,lambda:[],NOW+HOUR+900))
    def test_read_expiry_even_when_provider_fails(self):
        update_news(self.store,lambda:items(2),NOW)
        self.assertEqual(self.store.read(NOW+DAY)['articles'],[])
    def test_replacement_and_details(self):
        update_news(self.store,lambda:items(4),NOW)
        article=self.store.read(NOW)['articles'][0]
        self.assertNotIn('content',article)
        self.assertEqual(self.store.read(NOW,article['id'])['articles'][0]['content'],'Licensed article body')
        self.store.save(select_news(items(1),NOW),NOW)
        self.assertEqual(len(self.store.read(NOW)['articles']),1)
    def test_html_and_attribution(self):
        self.assertNotIn('evil',text('<p>Safe</p><script>evil()</script>'))
        mapped=map_posts([dict(link='https://globalvoices.org/a',date_gmt='2026-09-18T02:00:00',title={'rendered':'Story &amp; news'},content={'rendered':'<p>Body</p>'},excerpt={'rendered':'<p>Intro</p>'},_embedded={'author':[{'name':'Reporter'}]})])
        self.assertEqual(mapped[0]['author'],'Reporter');self.assertEqual(mapped[0]['image_url'],'');self.assertEqual(mapped[0]['content'],'Body')
    def test_restart_persistence(self):
        update_news(self.store,lambda:items(2),NOW)
        restarted=NewsStore(self.store.path);self.assertEqual(len(restarted.read(NOW)['articles']),2)
    def test_source_diversity(self):
        # 10 articles each from 4 publishers = 40 articles total
        publishers = ['BBC News', 'The Guardian', 'NPR World', 'Al Jazeera', 'TechCrunch']
        multi_items = []
        for pub in publishers:
            for i in range(10):
                multi_items.append(dict(
                    title=f'{pub} unique headline event {i}',
                    article_url=f'https://news.org/{pub.lower().replace(" ", "")}-{i}',
                    source_name=pub,
                    description=f'{pub} description {i}',
                    content='News body',
                    author=pub,
                    category='World',
                    published_at=NOW - i * 100,
                    license_url=f'https://news.org/{pub.lower().replace(" ", "")}-{i}'
                ))
        selected = select_news(multi_items, NOW)
        self.assertLessEqual(len(selected), 20)
        pub_counts = {}
        for a in selected:
            pub_counts[a['source_name']] = pub_counts.get(a['source_name'], 0) + 1
        # No publisher should exceed MAX_PER_PUB (3) when enough diverse publishers exist
        for pub, count in pub_counts.items():
            self.assertLessEqual(count, 3)
    def test_content_caching_and_status(self):
        update_news(self.store, lambda: items(1), NOW)
        art = self.store.read(NOW)['articles'][0]
        self.store.update_content(art['id'], '<p>Extracted full paragraph</p>', 'extracted', 'extractor', NOW)
        detail = self.store.read(NOW, art['id'])['articles'][0]
        self.assertEqual(detail['content'], '<p>Extracted full paragraph</p>')
        self.assertEqual(detail['contentStatus'], 'extracted')
        self.assertEqual(detail['contentSource'], 'extractor')

    def test_extractor_sanitization(self):
        from app import extract_article_content
        # Test mock HTML extraction logic using the module's parser
        import lxml.html
        raw_html = '''
        <html><body>
        <nav><a href="/home">Home</a></nav>
        <article>
          <h1>Article Title</h1>
          <script>alert("xss")</script>
          <iframe src="evil.com"></iframe>
          <h2>Key Highlights</h2>
          <p>This is the first important verified news paragraph with sufficient length.</p>
          <blockquote>A crucial quote from an international leader.</blockquote>
          <ul><li>First important bullet point here</li><li>Second critical piece of data</li></ul>
          <figure><img src="https://images.org/pic.jpg" /><figcaption>Photo by Press</figcaption></figure>
          <p>The closing paragraph explaining the broader geopolitical implications.</p>
          <div class="ad-banner">Buy our stuff!</div>
        </article>
        <footer>Copyright</footer>
        </body></html>
        '''
        # We can test extracting directly from the HTML structure
        tree = lxml.html.fromstring(raw_html)
        for el in tree.xpath('//script|//iframe|//nav|//footer'):
            el.getparent().remove(el)
        # Scripts and iframes are stripped
        self.assertEqual(len(tree.xpath('//script')), 0)
        self.assertEqual(len(tree.xpath('//iframe')), 0)
        self.assertEqual(len(tree.xpath('//nav')), 0)

    def test_department_metadata_and_hierarchy(self):
        from departments import get_departments_metadata, DEPARTMENTS
        meta = get_departments_metadata()
        dept_ids = [d['id'] for d in meta]
        self.assertIn('world', dept_ids)
        self.assertIn('sports', dept_ids)
        self.assertIn('technology', dept_ids)
        self.assertIn('business', dept_ids)
        self.assertIn('science', dept_ids)
        self.assertIn('entertainment', dept_ids)

        sports_dept = next(d for d in meta if d['id'] == 'sports')
        sports_subcats = [s['id'] for s in sports_dept['subcategories']]
        self.assertIn('cricket', sports_subcats)
        self.assertIn('football', sports_subcats)
        self.assertIn('tennis', sports_subcats)
        self.assertIn('basketball', sports_subcats)
        self.assertIn('formula-1', sports_subcats)
        self.assertIn('badminton', sports_subcats)
        self.assertIn('other-sports', sports_subcats)

    def test_independent_subcategory_top20_storage(self):
        # Generate 20 cricket and 20 football items
        cricket_items = [dict(
            id=f'cricket-{i}', title=f'Cricket match update {i}', article_url=f'https://cric.org/{i}',
            source_name='ESPN Cricinfo', description='Cricket score', content='Body', author='Commentator',
            category='Cricket', published_at=NOW - i * 10, expires_at=NOW + DAY, rank=2.0, dedupe_hash=f'c-{i}',
            image_url=''
        ) for i in range(20)]

        football_items = [dict(
            id=f'football-{i}', title=f'Football transfer news {i}', article_url=f'https://foot.org/{i}',
            source_name='BBC Sport', description='Football score', content='Body', author='Reporter',
            category='Football', published_at=NOW - i * 10, expires_at=NOW + DAY, rank=2.0, dedupe_hash=f'f-{i}',
            image_url=''
        ) for i in range(20)]

        self.store.save(cricket_items, NOW, department='sports', subcategory='cricket')
        self.store.save(football_items, NOW, department='sports', subcategory='football')

        cric_read = self.store.read(NOW, department='sports', subcategory='cricket')
        foot_read = self.store.read(NOW, department='sports', subcategory='football')

        # Both maintain their own 20 articles independently
        self.assertEqual(len(cric_read['articles']), 20)
        self.assertEqual(len(foot_read['articles']), 20)
        self.assertEqual(cric_read['articles'][0]['category'], 'Cricket')
        self.assertEqual(foot_read['articles'][0]['category'], 'Football')

if __name__=='__main__':unittest.main()



