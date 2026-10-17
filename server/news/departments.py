"""Configurable Departments & Subcategories for Meeetly News.
Provides department -> subcategory hierarchy and multi-source feed mappings.
"""

DEPARTMENTS = {
    'world': {
        'id': 'world',
        'name': 'World',
        'description': 'Global and international breaking news from across the globe.',
        'subcategories': {
            'international': {
                'id': 'international',
                'name': 'International',
                'feeds': [
                    ('BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/world/rss'),
                    ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'),
                    ('France 24', 'https://www.france24.com/en/rss'),
                    ('NPR World', 'https://feeds.npr.org/1004/rss.xml'),
                    ('Global Voices', 'https://globalvoices.org/feed/')
                ],
                'query': 'international world news'
            },
            'europe': {
                'id': 'europe',
                'name': 'Europe',
                'feeds': [
                    ('BBC News', 'https://feeds.bbci.co.uk/news/world/europe/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/world/europe-news/rss'),
                    ('France 24', 'https://www.france24.com/en/europe/rss')
                ],
                'query': 'europe news'
            },
            'asia': {
                'id': 'asia',
                'name': 'Asia',
                'feeds': [
                    ('BBC News', 'https://feeds.bbci.co.uk/news/world/asia/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/world/asia/rss'),
                    ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml')
                ],
                'query': 'asia news'
            },
            'middle-east': {
                'id': 'middle-east',
                'name': 'Middle East',
                'feeds': [
                    ('BBC News', 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/world/middleeast/rss'),
                    ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'),
                    ('France 24', 'https://www.france24.com/en/middle-east/rss')
                ],
                'query': 'middle east news'
            },
            'africa': {
                'id': 'africa',
                'name': 'Africa',
                'feeds': [
                    ('BBC News', 'https://feeds.bbci.co.uk/news/world/africa/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/world/africa/rss'),
                    ('France 24', 'https://www.france24.com/en/africa/rss')
                ],
                'query': 'africa news'
            }
        }
    },
    'sports': {
        'id': 'sports',
        'name': 'Sports',
        'description': 'Live coverage, scores, and updates across major world sports.',
        'subcategories': {
            'cricket': {
                'id': 'cricket',
                'name': 'Cricket',
                'feeds': [
                    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/cricket/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/sport/cricket/rss'),
                    ('ESPN Cricinfo', 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml')
                ],
                'query': 'cricket news match'
            },
            'football': {
                'id': 'football',
                'name': 'Football',
                'feeds': [
                    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/football/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/football/rss'),
                    ('France 24', 'https://www.france24.com/en/sports/rss')
                ],
                'query': 'football soccer premier league'
            },
            'tennis': {
                'id': 'tennis',
                'name': 'Tennis',
                'feeds': [
                    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/tennis/rss.xml'),
                    ('Sky Sports', 'https://www.skysports.com/rss/12040'),
                    ('The Guardian', 'https://www.theguardian.com/sport/tennis/rss')
                ],
                'query': 'tennis atp wta grand slam'
            },
            'basketball': {
                'id': 'basketball',
                'name': 'Basketball',
                'feeds': [
                    ('Yahoo Sports', 'https://sports.yahoo.com/nba/rss.xml'),
                    ('ESPN', 'https://www.espn.com/espn/rss/nba/news'),
                    ('Sky Sports', 'https://www.skysports.com/rss/12087')
                ],
                'query': 'nba basketball game'
            },
            'formula-1': {
                'id': 'formula-1',
                'name': 'Formula 1',
                'feeds': [
                    ('Autosport', 'https://www.autosport.com/rss/f1/news/'),
                    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/formula1/rss.xml'),
                    ('Sky Sports', 'https://www.skysports.com/rss/12433'),
                    ('Motorsport.com', 'https://www.motorsport.com/rss/f1/news/'),
                    ('Crash.net', 'https://www.crash.net/rss/f1')
                ],
                'query': 'formula 1 f1 grand prix'
            },
            'badminton': {
                'id': 'badminton',
                'name': 'Badminton',
                'feeds': [
                    ('Badminton Planet', 'https://www.badmintonplanet.com/feed'),
                    ('Badzine', 'https://www.badzine.net/feed/'),
                    ('Google News', 'https://news.google.com/rss/search?q=badminton&hl=en-US&gl=US&ceid=US:en')
                ],
                'query': 'badminton bwf tournament'
            },
            'other-sports': {
                'id': 'other-sports',
                'name': 'Other Sports',
                'feeds': [
                    ('BBC Sport', 'https://feeds.bbci.co.uk/sport/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/sport/rss'),
                    ('France 24', 'https://www.france24.com/en/sports/rss')
                ],
                'query': 'sports athletics olympics'
            }
        }
    },
    'technology': {
        'id': 'technology',
        'name': 'Technology',
        'description': 'Tech breakthroughs, artificial intelligence, gadgets, and cybersecurity.',
        'subcategories': {
            'ai': {
                'id': 'ai',
                'name': 'AI',
                'feeds': [
                    ('TechCrunch', 'https://techcrunch.com/category/artificial-intelligence/feed/'),
                    ('The Verge', 'https://www.theverge.com/rss/index.xml'),
                    ('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'),
                    ('Google News', 'https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en')
                ],
                'query': 'artificial intelligence machine learning'
            },
            'software': {
                'id': 'software',
                'name': 'Software',
                'feeds': [
                    ('TechCrunch', 'https://techcrunch.com/feed/'),
                    ('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'),
                    ('BBC Tech', 'https://feeds.bbci.co.uk/news/technology/rss.xml')
                ],
                'query': 'software developer tech'
            },
            'gadgets': {
                'id': 'gadgets',
                'name': 'Gadgets',
                'feeds': [
                    ('The Verge', 'https://www.theverge.com/rss/index.xml'),
                    ('Wired', 'https://www.wired.com/feed/rss'),
                    ('The Guardian', 'https://www.theguardian.com/technology/rss')
                ],
                'query': 'gadgets smartphone tech reviews'
            },
            'cybersecurity': {
                'id': 'cybersecurity',
                'name': 'Cybersecurity',
                'feeds': [
                    ('Wired', 'https://www.wired.com/feed/category/security/latest/rss'),
                    ('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index'),
                    ('Google News', 'https://news.google.com/rss/search?q=cybersecurity+vulnerability&hl=en-US&gl=US&ceid=US:en')
                ],
                'query': 'cybersecurity hacker malware'
            },
            'startups': {
                'id': 'startups',
                'name': 'Startups',
                'feeds': [
                    ('TechCrunch', 'https://techcrunch.com/category/startups/feed/'),
                    ('The Verge', 'https://www.theverge.com/rss/index.xml'),
                    ('Google News', 'https://news.google.com/rss/search?q=venture+capital+startup&hl=en-US&gl=US&ceid=US:en')
                ],
                'query': 'startup funding seed funding'
            }
        }
    },
    'business': {
        'id': 'business',
        'name': 'Business',
        'description': 'Global financial markets, economies, business strategy, and companies.',
        'subcategories': {
            'markets': {
                'id': 'markets',
                'name': 'Markets',
                'feeds': [
                    ('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362'),
                    ('The Guardian', 'https://www.theguardian.com/business/stock-markets/rss'),
                    ('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml')
                ],
                'query': 'stock market wall street'
            },
            'finance': {
                'id': 'finance',
                'name': 'Finance',
                'feeds': [
                    ('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664'),
                    ('The Guardian', 'https://www.theguardian.com/business/rss')
                ],
                'query': 'banking finance banking sector'
            },
            'economy': {
                'id': 'economy',
                'name': 'Economy',
                'feeds': [
                    ('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258'),
                    ('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/business/economics/rss')
                ],
                'query': 'global economy inflation gdp'
            },
            'companies': {
                'id': 'companies',
                'name': 'Companies',
                'feeds': [
                    ('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069'),
                    ('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/business/rss')
                ],
                'query': 'corporate earnings companies'
            },
            'startups': {
                'id': 'startups',
                'name': 'Startups',
                'feeds': [
                    ('TechCrunch', 'https://techcrunch.com/category/startups/feed/'),
                    ('CNBC', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147')
                ],
                'query': 'fintech startups enterprise'
            }
        }
    },
    'science': {
        'id': 'science',
        'name': 'Science',
        'description': 'Space exploration, environment, scientific discoveries, and health.',
        'subcategories': {
            'space': {
                'id': 'space',
                'name': 'Space',
                'feeds': [
                    ('NASA', 'https://www.nasa.gov/news-release/feed/'),
                    ('BBC Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/science/space/rss')
                ],
                'query': 'astronomy space nasa rocket'
            },
            'environment': {
                'id': 'environment',
                'name': 'Environment',
                'feeds': [
                    ('The Guardian', 'https://www.theguardian.com/environment/rss'),
                    ('BBC Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'),
                    ('France 24', 'https://www.france24.com/en/environment/rss')
                ],
                'query': 'climate change environment renewable energy'
            },
            'research': {
                'id': 'research',
                'name': 'Research',
                'feeds': [
                    ('The Guardian', 'https://www.theguardian.com/science/rss'),
                    ('BBC Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml')
                ],
                'query': 'scientific discovery research study'
            },
            'health-science': {
                'id': 'health-science',
                'name': 'Health Science',
                'feeds': [
                    ('BBC Health', 'https://feeds.bbci.co.uk/news/health/rss.xml'),
                    ('The Guardian', 'https://www.theguardian.com/society/health/rss')
                ],
                'query': 'medical research health science clinical'
            }
        }
    },
    'entertainment': {
        'id': 'entertainment',
        'name': 'Entertainment',
        'description': 'Cinema, music, television, celebrity culture, and gaming.',
        'subcategories': {
            'movies': {
                'id': 'movies',
                'name': 'Movies',
                'feeds': [
                    ('The Guardian Film', 'https://www.theguardian.com/film/rss'),
                    ('BBC Entertainment', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml')
                ],
                'query': 'cinema film movie release'
            },
            'music': {
                'id': 'music',
                'name': 'Music',
                'feeds': [
                    ('The Guardian Music', 'https://www.theguardian.com/music/rss'),
                    ('BBC Entertainment', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml')
                ],
                'query': 'music album concert artist'
            },
            'tv': {
                'id': 'tv',
                'name': 'TV',
                'feeds': [
                    ('The Guardian TV', 'https://www.theguardian.com/tv-and-radio/rss'),
                    ('BBC Entertainment', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml')
                ],
                'query': 'television series episode stream'
            },
            'celebrities': {
                'id': 'celebrities',
                'name': 'Celebrities',
                'feeds': [
                    ('BBC Entertainment', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'),
                    ('The Guardian Culture', 'https://www.theguardian.com/culture/rss')
                ],
                'query': 'celebrity actors award red carpet'
            },
            'gaming': {
                'id': 'gaming',
                'name': 'Gaming',
                'feeds': [
                    ('The Guardian Games', 'https://www.theguardian.com/games/rss'),
                    ('Ars Technica Gaming', 'https://feeds.arstechnica.com/arstechnica/gaming'),
                    ('Google News', 'https://news.google.com/rss/search?q=video+games+gaming&hl=en-US&gl=US&ceid=US:en')
                ],
                'query': 'video game playstation xbox nintendo'
            }
        }
    }
}

def get_departments_metadata():
    """Returns serialized structure of departments and subcategories for the frontend."""
    res = []
    for dept_id, dept in DEPARTMENTS.items():
        subcats = [
            {'id': s_id, 'name': s['name']}
            for s_id, s in dept['subcategories'].items()
        ]
        res.append({
            'id': dept_id,
            'name': dept['name'],
            'description': dept.get('description', ''),
            'subcategories': subcats
        })
    return res

def get_department_config(dept_id: str):
    return DEPARTMENTS.get(dept_id.lower().strip())

def get_subcategory_config(dept_id: str, subcat_id: str):
    dept = get_department_config(dept_id)
    if not dept:
        return None
    return dept['subcategories'].get(subcat_id.lower().strip())
