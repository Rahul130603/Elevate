/**
 * Industry relevance — "only this industry's news" filtering.
 *
 * The Google News keyword feeds behind the industry section are *topical*, not
 * exclusive: a query like "IT software services industry exports" happily returns
 * a banking or politics story that merely mentions software once. That is what put
 * other news on an industry page.
 *
 * This module gives every industry (and every one of its sub-sections) a keyword
 * signature, then:
 *
 *   1. scores a headline against all 18 industry signatures and picks the best
 *      match (`matchIndustry`),
 *   2. keeps only the stories whose best match is the industry being viewed, so
 *      another industry's story can never appear on this industry's page,
 *   3. scores the survivors against the sub-section signature, so a SaaS page
 *      leads with SaaS stories.
 *
 * Signatures are derived from the taxonomy itself (label + feed query) and
 * topped up with curated keywords below, so the two cannot drift apart silently:
 * renaming a sub-section renames its keywords too.
 *
 * Keyword syntax
 * --------------
 * - `finance`, `renewables`   → case-insensitive word match, plural-insensitive
 *                               ("bank" also matches "banks").
 * - `IT`, `AI`, `UPI`, `SaaS` → contains a capital after the first letter, so it
 *                               is matched case-sensitively as a whole word. That
 *                               is what keeps the word "it" out of IT news.
 * - `mutual funds`, `data centre` → several words = a phrase, each word matched
 *                               with the same plural-insensitivity.
 */

import { getSection, type FeedSpec } from "./categories";
import type { Article } from "./news-types";

/* ------------------------------------------------------------------ */
/* Curated keyword signatures                                          */
/* ------------------------------------------------------------------ */

/**
 * Words that carry no industry signal on their own. They are dropped from the
 * derived part of a signature (never from the curated lists, where a word like
 * "scheme" is meaningful for mutual funds).
 */
const STOPWORDS = new Set<string>([
  "industry", "industries", "sector", "sectors", "news", "latest", "update", "updates",
  "top", "best", "new", "more", "most", "big", "major", "small", "mid",
  "company", "companies", "firm", "firms", "group", "groups", "business", "corporate",
  "market", "markets", "product", "products", "service", "services", "platform", "platforms",
  "solution", "solutions", "data", "india", "indian", "global", "national", "international",
  "state", "states", "city", "cities", "online", "offline",
  "sales", "sale", "demand", "supply", "growth", "grow", "price", "prices", "pricing",
  "launch", "launches", "launched", "report", "reports", "plan", "plans", "deal", "deals",
  "profit", "profits", "revenue", "revenues", "share", "shares", "stake", "stakes",
  "management", "technology", "tech", "digital", "design", "care", "general",
  "government", "policy", "policies", "scheme", "schemes", "project", "projects",
  "crore", "lakh", "million", "billion", "percent", "year", "years", "month", "months",
  "day", "days", "week", "weeks", "today", "tomorrow", "first", "second", "third",
  "rise", "rises", "fall", "falls", "high", "low", "record", "set", "gets", "get",
  "make", "makes", "made", "see", "says", "said", "will", "can", "may", "amid",
  "over", "after", "before", "during", "into", "from", "with", "that", "this",
  "these", "those", "their", "there", "here", "what", "when", "where", "which",
  "who", "why", "how", "and", "the", "for", "not", "but", "all", "any", "our",
  "its", "his", "her", "they", "them", "you", "your", "are", "was", "were",
  "has", "have", "had", "been", "being", "does", "did", "doing", "also", "only",
  "just", "even", "than", "then", "now", "some", "such", "other", "others",
  "many", "much", "very", "well", "back", "out", "off", "per", "two", "three",
]);

/** Extra signature words per industry — the words that make a story *that* story. */
const INDUSTRY_KEYWORDS: Record<string, readonly string[]> = {
  finance: [
    "bank", "banking", "finance", "financial", "financials", "lending", "lender", "lenders",
    "loan", "loans", "credit", "deposit", "deposits", "nbfc", "insurance", "insurer", "insurers",
    "rbi", "sebi", "irdai", "fintech", "UPI", "payment", "payments", "mutual fund", "mutual funds",
    "amc", "sip", "stock", "stocks", "stock market", "sensex", "nifty", "bse", "nse", "ipo",
    "equity", "equities", "bond", "bonds", "rupee", "forex", "treasury", "npa", "default",
    "wealth", "portfolio", "private equity", "venture capital", "pension", "nps",
    "GST", "income tax", "taxation", "taxpayer",
  ],
  "it-software": [
    "IT", "software", "saas", "SaaS", "cloud", "cloud computing", "cybersecurity", "cyber",
    "cyberattack", "ransomware", "malware", "breach", "artificial intelligence", "AI", "ML",
    "machine learning", "generative", "genai", "GenAI", "LLM", "LLMs", "chatgpt", "ChatGPT",
    "startup", "startups", "outsourcing", "outsource", "export", "exports", "IT services",
    "app", "apps", "developer", "developers", "coding", "devops", "enterprise software",
    "data centre", "data center",
    "analytics", "ERP", "capability centre", "capability center", "captive", "attrition",
  ],
  publishing: [
    "book", "books", "publishing", "publisher", "publishers", "author", "authors",
    "newspaper", "newspapers", "magazine", "magazines", "journal", "journals",
    "periodical", "periodicals", "printing", "print", "press", "presses", "newsroom",
    "editorial", "library", "literature", "fiction", "novel", "novelist", "ebook",
    "audiobook", "self-publishing", "bestseller", "bestsellers", "publishing house",
  ],
  "culinary-hospitality": [
    "restaurant", "restaurants", "hotel", "hotels", "hospitality", "resort", "resorts",
    "cafe", "cafes", "cloud kitchen", "cloud kitchens", "catering", "caterer", "bakery",
    "confectionery", "chef", "chefs", "culinary", "QSR", "dining", "dine", "menu",
    "sweet", "sweets", "coffee shop", "food delivery", "packaged food", "food service",
    "gourmet", "liquor", "alcohol", "pub", "FSSAI", "food safety",
  ],
  "healthcare-medical": [
    "hospital", "hospitals", "healthcare", "health care", "pharma", "pharmaceutical",
    "pharmaceuticals", "medicine", "medicines", "drug", "drugs", "vaccine", "vaccines",
    "diagnostic", "diagnostics", "pathology", "clinic", "clinics", "nursing", "nurse",
    "nurses", "doctor", "doctors", "surgery", "surgical", "medical device", "medical devices",
    "dental", "dentist", "dentistry", "ayurveda", "homeopathy", "wellness", "patient",
    "patients", "treatment", "treatments", "therapy", "physiotherapy", "ICU",
    "telemedicine", "mental health", "psychiatry", "counselling", "counseling",
  ],
  manufacturing: [
    "manufacturing", "manufacturer", "manufacturers", "factory", "factories", "engineering",
    "engineer", "machinery", "machine", "machines", "equipment", "electronics", "electronic",
    "component", "components", "chemical", "chemicals", "petrochemical", "petrochemicals",
    "steel", "metal", "metals", "aluminium", "aluminum", "copper", "plastic", "plastics",
    "packaging", "industrial", "capital goods", "foundry", "forging", "semiconductor",
    "semiconductors", "chip", "chips", "assembly line", "IIP",
    "automation", "robotics", "robot", "robots", "defence manufacturing",
    "defence production", "PLI", "production linked incentive",
  ],
  "retail-ecommerce": [
    "retail", "retailer", "retailers", "ecommerce", "quick commerce", "q-commerce",
    "dark store", "dark stores", "kirana", "supermarket", "supermarkets", "grocery",
    "groceries", "mall", "malls", "store", "stores", "shopper", "shoppers", "D2C",
    "marketplace", "flipkart", "amazon india", "meesho", "zepto", "blinkit", "instamart",
    "bigbasket", "quick delivery", "retail chain",
    "luxury", "wholesale", "durables", "consumer durables", "retail tech",
  ],
  "real-estate": [
    "real estate", "property", "properties", "housing", "homebuyer", "homebuyers",
    "home buyer", "builder", "builders", "realty", "construction", "infrastructure",
    "cement", "concrete", "RERA", "apartment", "apartments", "flat", "flats", "villa",
    "villas", "township", "commercial property", "office space", "rental", "realtor",
    "proptech", "prop tech", "smart city", "metro rail", "housing society",
    "interior", "interiors", "decor", "furniture", "furnishing", "modular kitchen",
    "laminate", "plywood",
    "green building", "construction equipment", "township", "plotted",
    "co-living", "coworking", "co-working",
  ],
  "education-edtech": [
    "school", "schools", "student", "students", "teacher", "teachers", "college",
    "colleges", "university", "universities", "education", "educational", "edtech",
    "exam", "exams", "admission", "admissions", "coaching", "tuition", "curriculum",
    "syllabus", "classroom", "campus", "placement", "placements", "scholarship",
    "degree", "course", "courses", "certification", "skill", "skills", "NEET", "JEE",
    "CBSE", "ICSE", "UGC", "AICTE", "IELTS", "study abroad",
    "preschool", "scholarship", "scholarships", "student loan", "education loan",
  ],
  "media-entertainment": [
    "media", "entertainment", "film", "films", "cinema", "movie", "movies", "box office",
    "bollywood", "hollywood", "tollywood", "kollywood", "mollywood", "OTT", "streaming",
    "web series", "television", "channel", "channels", "broadcast", "broadcaster",
    "music", "album", "song", "songs", "radio", "podcast", "podcasts", "celebrity",
    "actor", "actress", "trailer", "youtube", "netflix", "hotstar", "spotify", "content creator",
    "film festival", "media rights", "sports rights", "awards night",
  ],
  logistics: [
    "logistics", "shipping", "port", "ports", "cargo", "freight", "truck", "trucks",
    "trucking", "transporter", "transporters", "courier", "parcel", "warehouse",
    "warehousing", "supply chain", "cold chain", "last mile", "aviation", "airline",
    "airlines", "airport", "flight", "flights", "railway", "railways", "train", "trains",
    "wagon", "container", "containers", "customs", "EXIM", "shipping line", "logistics firm",
    "cold chain", "metro", "3PL", "trade policy",
  ],
  energy: [
    "energy", "power", "electricity", "utility", "utilities", "discom", "discoms", "grid",
    "renewable", "renewables", "solar", "wind", "hydro", "hydropower", "nuclear", "coal",
    "thermal", "oil", "gas", "petroleum", "crude", "refining", "refinery", "refineries",
    "LPG", "CNG", "PNG", "pipeline", "ONGC", "NTPC", "petrol", "diesel", "fuel", "biofuel",
    "ethanol", "hydrogen", "charging station", "waste management", "recycling", "water supply",
    "energy storage", "battery", "batteries", "BESS", "mining", "green hydrogen",
  ],
  "agriculture-food": [
    "agriculture", "farming", "farmer", "farmers", "farm", "farms", "crop", "crops", "agri",
    "agritech", "dairy", "milk", "fisheries", "fishery", "aquaculture", "fishing",
    "food processing", "food export", "food exports", "fertiliser", "fertilisers",
    "fertilizer", "fertilizers", "seed", "seeds", "pesticide", "pesticides", "harvest",
    "kharif", "rabi", "mandi", "MSP", "horticulture", "poultry", "livestock", "sugar",
    "rice", "wheat", "pulses", "edible oil", "plantation", "spices",
    "meat", "tractor", "tractors", "horticulture", "ethanol blending",
  ],
  automobile: [
    "automobile", "auto", "automotive", "car", "cars", "vehicle", "vehicles",
    "two-wheeler", "two-wheelers", "scooter", "scooters", "motorcycle", "motorcycles",
    "bike", "bikes", "SUV", "SUVs", "sedan", "hatchback", "commercial vehicle",
    "commercial vehicles", "tyre", "tyres", "tire", "tires", "auto components", "OEM",
    "EV", "EVs", "electric vehicle", "electric vehicles", "showroom", "dealership",
    "maruti", "hyundai", "tata motors", "mahindra", "bajaj", "royal enfield",
    "aftermarket", "used car", "pre-owned", "luxury car", "connected car",
  ],
  "textiles-apparel": [
    "textile", "textiles", "apparel", "garment", "garments", "clothing", "fabric",
    "fabrics", "spinning", "yarn", "mill", "mills", "handloom", "handicraft",
    "handicrafts", "khadi", "cotton", "silk", "denim", "weaving", "weaver", "weavers",
    "fashion", "footwear", "shoe", "shoes", "saree", "sarees", "technical textiles",
    "man-made fibre", "polyester", "viscose", "attire",
    "wool", "home textiles", "home furnishing", "organic cotton", "silk",
  ],
  "travel-tourism": [
    "travel", "tourism", "tourist", "tourists", "holiday", "holidays", "vacation",
    "trip", "trips", "itinerary", "homestay", "homestays", "pilgrimage", "cruise",
    "cruises", "destination", "destinations", "visa", "passport", "travel tech",
    "booking", "bookings", "OTA", "makemytrip", "ixigo", "yatra", "IRCTC",
    "eco-tourism", "adventure tourism", "conference", "convention", "MICE",
    "wildlife", "safari", "wedding", "weddings", "medical tourism", "visa",
  ],
  "advertising-marketing": [
    /*
     * Deliberately *not* here: campaign, brand, ad/ads, agency, creative. Each is
     * common outside marketing ("slavery reparations campaign", "brand new",
     * "government agency"), which pulled non-industry stories onto the hub. Their
     * own sub-sections still match them, so the marketing pages keep working.
     */
    "advertising", "advertisement", "adex", "marketing", "marketer", "marketers",
    "branding", "media buying", "digital marketing", "SEO", "SEM", "influencer",
    "influencers", "creator economy", "public relations", "PR", "communications",
    "market research", "consumer insights", "sponsorship", "billboard",
    "ad spend", "adspend",
    "adtech", "ad-tech", "programmatic", "social media marketing", "media buying",
  ],
  "animation-vfx": [
    "animation", "animated", "anime", "VFX", "visual effects", "CGI", "motion graphics",
    "studio", "studios", "animator", "animators", "gaming", "gamer", "gamers", "game",
    "games", "esports", "e-sports", "console", "playstation", "xbox", "nintendo",
    "AR", "VR", "augmented reality", "virtual reality", "mixed reality", "metaverse",
    "comic", "comics", "illustration", "illustrator", "cartoon", "cartoons",
    "post production", "post-production", "dubbing", "rendering", "3D",
    "virtual production", "metaverse", "web3", "Web3", "esports",
  ],
};

/**
 * Sub-section keywords, for the ones whose taxonomy query is too thin to rank
 * within their industry. Only used to order stories the industry already owns.
 */
const SUB_KEYWORDS: Record<string, readonly string[]> = {
  "finance/markets": ["stock", "stocks", "stock market", "sensex", "nifty", "bse", "nse", "ipo", "shares", "rally", "equity", "brokerage"],
  "finance/banking": ["bank", "banks", "banking", "rbi", "deposit", "deposits", "npa", "lender", "lending", "branch"],
  "finance/insurance": ["insurance", "insurer", "insurers", "policyholder", "premium", "irdai", "claim", "claims", "cover"],
  "finance/nbfc": ["nbfc", "nbfcs", "microfinance", "loan", "loans", "borrower", "borrowers", "lender", "lending", "gold loan"],
  "finance/payments": ["payment", "payments", "fintech", "UPI", "wallet", "wallets", "POS", "card", "cards", "transaction", "transactions", "NPCI"],
  "finance/mutual-funds": ["mutual fund", "mutual funds", "amc", "amcs", "SIP", "SIPs", "NAV", "folio", "folios", "equity fund", "debt fund"],
  "it-software/software-services": ["outsourcing", "outsource", "IT services", "contract", "contracts", "headcount", "attrition", "billings", "deal wins"],
  "it-software/saas": ["saas", "SaaS", "software product", "subscription", "subscriptions", "ARR", "startup", "startups", "cloud software"],
  "it-software/ai-ml": ["artificial intelligence", "AI", "ML", "machine learning", "generative", "genai", "GenAI", "LLM", "LLMs", "chatgpt", "ChatGPT", "deep learning", "copilot", "neural"],
  "it-software/cybersecurity": ["cybersecurity", "cyber", "cyberattack", "cyberattacks", "ransomware", "malware", "phishing", "breach", "breaches", "hacker", "hackers", "hacking", "vulnerability", "encryption"],
  "it-software/cloud": ["cloud", "cloud computing", "data centre", "data center", "data centres", "hyperscaler", "hyperscalers", "AWS", "Azure", "server", "servers", "colocation"],
  "it-software/fintech-software": ["fintech", "fintechs", "payment", "payments", "neobank", "neobanks", "core banking", "banking software"],
  "media-entertainment/ott": ["OTT", "streaming", "web series", "series", "platform", "subscriber", "subscribers", "netflix", "hotstar", "prime video", "jio cinema"],
  "media-entertainment/film": ["film", "films", "cinema", "movie", "movies", "box office", "screens", "release", "shooting"],
  "energy/renewables": ["renewable", "renewables", "solar", "wind", "hydro", "green energy", "clean energy", "rooftop", "module", "modules", "turbine"],
  "energy/oil-gas": ["oil", "gas", "crude", "refinery", "refineries", "refining", "petrol", "diesel", "LPG", "CNG", "pipeline", "fuel"],
  "automobile/cars": ["car", "cars", "SUV", "sedan", "hatchback", "passenger vehicle", "passenger vehicles", "launch", "variant"],
  "automobile/ev-auto": ["EV", "EVs", "electric vehicle", "electric vehicles", "electric car", "electric scooter", "battery", "charging"],
  "real-estate/housing": ["housing", "home", "homes", "apartment", "apartments", "flat", "flats", "homebuyer", "homebuyers", "affordable housing", "residential"],
  "real-estate/interiors": ["interior", "interiors", "design", "decor", "furniture", "furnishing", "modular kitchen", "laminate", "plywood", "architect"],
  /*
   * Publishing's sections are broad words on their own ("digital", "educational",
   * "accessibility"), so each one is pinned to the publishing sense of the word.
   */
  "publishing/educational": ["educational publishing", "textbook", "textbooks", "curriculum", "school books", "academic publishing", "learning materials"],
  "publishing/professional-technical": ["professional publishing", "technical publishing", "professional books", "technical books", "reference books", "standards publishing", "manual"],
  "publishing/digital": ["digital publishing", "ebook", "ebooks", "e-book", "e-books", "audiobook", "audiobooks", "EPUB", "kindle", "online publishing"],
  "publishing/printing-pod": ["printing", "printer", "printers", "press", "presses", "print on demand", "POD", "offset printing", "bookbinding", "paper"],
  "publishing/scientific-medical": ["scientific publishing", "medical publishing", "scientific journal", "scientific journals", "medical journal", "medical journals", "peer review", "research publishing", "academic paper"],
  "publishing/accessibility": ["accessible publishing", "accessible books", "accessibility", "screen reader", "braille", "dyslexia", "assistive technology", "large print"],
  /*
   * The sections added in the second pass: several are ordinary words on their
   * own ("private", "used", "home", "rental"), so each is pinned to its industry
   * sense the same way the publishing sections are.
   */
  "finance/private-equity": ["private equity", "venture capital", "PE fund", "PE funds", "VC firm", "VC firms", "funding round", "series A", "series B", "term sheet", "fundraise", "fundraising"],
  "finance/wealth-management": ["wealth management", "wealth", "portfolio", "PMS", "family office", "HNI", "advisors", "asset allocation"],
  "finance/taxation": ["GST", "income tax", "taxation", "tax filing", "taxpayers", "CBDT", "ITR", "tax refund"],
  "finance/pension": ["pension", "NPS", "retirement", "EPFO", "provident fund", "annuity", "gratuity"],
  "it-software/data-analytics": ["analytics", "data analytics", "big data", "business intelligence", "data science", "data engineering", "data platform"],
  "it-software/enterprise-erp": ["ERP", "enterprise software", "SAP", "Oracle", "CRM", "business software"],
  "it-software/gcc": ["global capability centre", "global capability center", "GCC", "captive centre", "captive center", "captive unit", "captives", "capability centres"],
  "it-software/it-hiring": ["hiring", "attrition", "layoffs", "headcount", "recruitment", "IT jobs", "tech jobs", "employees"],
  "culinary-hospitality/cafes-qsr": ["cafe", "cafes", "coffee", "QSR", "quick service restaurant", "outlets", "barista"],
  "culinary-hospitality/bars-beverages": ["liquor", "alcohol", "beverages", "brewery", "breweries", "wine", "beer", "spirits", "excise policy", "pub", "bars"],
  "manufacturing/industrial-policy": ["PLI", "production linked incentive", "industrial policy", "make in india", "manufacturing policy", "industrial corridor"],
  "real-estate/rental-coliving": ["rental", "rentals", "co-living", "coworking", "co-working", "paying guest", "lease", "tenant", "landlord"],
  "real-estate/township-plots": ["township", "townships", "plotted development", "plots", "land parcel", "layout"],
  "automobile/used-cars": ["used car", "used cars", "pre-owned", "resale", "second-hand car", "certified pre-owned"],
  "textiles-apparel/home-textiles": ["home textiles", "home furnishing", "home furnishings", "bed linen", "towels", "carpets", "rugs", "upholstery", "made-ups"],
  "animation-vfx/dubbing-localisation": ["dubbing", "localisation", "localization", "voice artist", "voiceover", "subtitling", "localisation services"],
};

/**
 * Words a bucket would inherit from its own label/query but that belong to a
 * sibling industry. "Travel & Tourism" quotes "airline hospitality sector" in its
 * query, which would otherwise make every aviation and hotel story look like
 * travel news.
 */
const DROPPED: Record<string, readonly string[]> = {
  "travel-tourism": ["airline", "hospitality"],
};

/* ------------------------------------------------------------------ */
/* Signature building                                                  */
/* ------------------------------------------------------------------ */

type Bucket = {
  /** Base forms of every case-insensitive single word. */
  words: Set<string>;
  /** Case-sensitive whole-word patterns (acronyms: IT, AI, UPI, SaaS …). */
  exact: RegExp[];
  /** Phrases, each word kept as its set of accepted base forms. */
  phrases: Set<string>[][];
};

/** Strips plural/possessive endings so "bank" matches "banks". */
function baseForms(word: string): Set<string> {
  const forms = new Set<string>([word]);
  if (word.endsWith("ies") && word.length > 4) forms.add(`${word.slice(0, -3)}y`);
  if (word.endsWith("es") && word.length > 3) forms.add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 2) forms.add(word.slice(0, -1));
  return forms;
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactWordPattern(word: string): RegExp {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, "u");
}

/** `label` + feed query, minus stopwords and words that belong to a sibling. */
function derivedKeywords(label: string, feed: FeedSpec, drop: readonly string[]): string[] {
  const source = feed.kind === "query" ? `${label} ${feed.query}` : label;
  return source
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 || /^[A-Z0-9]{2,}$/.test(token))
    .filter((token) => !STOPWORDS.has(token.toLowerCase()))
    .filter((token) => !drop.includes(token.toLowerCase()));
}

function buildBucket(raw: readonly string[]): Bucket {
  const words = new Set<string>();
  const exact: RegExp[] = [];
  const phrases: Set<string>[][] = [];

  for (const entry of raw) {
    const text = entry.trim();
    if (!text) continue;

    // "IT", "AI", "UPI", "SaaS", "3D" are matched case-sensitively; "Finance"
    // and "finance" are not.
    if (/[A-Z]/.test(text) && !/^[A-Z][a-z]*$/.test(text)) {
      exact.push(exactWordPattern(text));
      continue;
    }

    const parts = wordsOf(text);
    if (parts.length === 0) continue;
    if (parts.length === 1) {
      for (const form of baseForms(parts[0])) words.add(form);
    } else {
      phrases.push(parts.map((part) => baseForms(part)));
    }
  }

  return { words, exact, phrases };
}

type Tokens = { bases: Set<string>[] };

function tokenize(title: string): Tokens {
  return { bases: wordsOf(title).map((word) => baseForms(word)) };
}

function hasPhrase(tokens: Tokens, phrase: Set<string>[]): boolean {
  for (let start = 0; start + phrase.length <= tokens.bases.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < phrase.length; offset += 1) {
      let hit = false;
      for (const form of tokens.bases[start + offset]) {
        if (phrase[offset].has(form)) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

/** How many of the bucket's keywords the headline contains. */
function score(tokens: Tokens, title: string, bucket: Bucket): number {
  let hits = 0;

  for (const forms of tokens.bases) {
    for (const form of forms) {
      if (bucket.words.has(form)) {
        hits += 1;
        break;
      }
    }
  }

  for (const phrase of bucket.phrases) {
    if (hasPhrase(tokens, phrase)) hits += 1;
  }

  for (const pattern of bucket.exact) {
    if (pattern.test(title)) hits += 1;
  }

  return hits;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const industries = getSection("industry").subs;

const buckets = new Map<string, Bucket>();

function cachedBucket(key: string, build: () => Bucket): Bucket {
  const existing = buckets.get(key);
  if (existing) return existing;
  const bucket = build();
  buckets.set(key, bucket);
  return bucket;
}

/** The 18 industry signatures, keyed by industry id (`finance`, `it-software`, …). */
export function industryBucket(industryId: string): Bucket {
  return cachedBucket(`industry:${industryId}`, () => {
    const industry = industries.find((entry) => entry.id === industryId);
    if (!industry) return buildBucket([]);
    const drop = DROPPED[industryId] ?? [];
    return buildBucket([
      ...derivedKeywords(industry.label, industry.feed, drop),
      ...(INDUSTRY_KEYWORDS[industryId] ?? []),
    ]);
  });
}

/** A sub-section signature — used only to rank stories inside one industry. */
export function subSectionBucket(industryId: string, subId: string): Bucket {
  return cachedBucket(`sub:${industryId}/${subId}`, () => {
    const industry = industries.find((entry) => entry.id === industryId);
    const sub = industry?.subs?.find((entry) => entry.id === subId);
    if (!industry || !sub) return buildBucket([]);
    const drop = DROPPED[industryId] ?? [];
    return buildBucket([
      ...derivedKeywords(sub.label, sub.feed, drop),
      ...(SUB_KEYWORDS[`${industryId}/${subId}`] ?? []),
    ]);
  });
}

/**
 * The industry a headline belongs to, or `null` when it matches no industry at
 * all (politics, sport, crime, … — the "other news" this section must not show).
 */
export function matchIndustry(title: string): { industry: string; score: number } | null {
  const tokens = tokenize(title);
  let best: { industry: string; score: number } | null = null;

  for (const industry of industries) {
    const hits = score(tokens, title, industryBucket(industry.id));
    if (hits === 0) continue;
    if (!best || hits > best.score) best = { industry: industry.id, score: hits };
  }

  return best;
}

/** How strongly a headline matches one industry's signature (0 = not at all). */
export function industryScore(title: string, industryId: string): number {
  return score(tokenize(title), title, industryBucket(industryId));
}

/** How strongly a headline matches a sub-section's own signature. */
export function subSectionScore(title: string, industryId: string, subId: string): number {
  return score(tokenize(title), title, subSectionBucket(industryId, subId));
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

/** Below this, a page is padded so it never looks broken. */
const MIN_INDUSTRY_ARTICLES = 6;
const MIN_SUB_ARTICLES = 5;
const MIN_ANY_ARTICLES = 8;

/**
 * Level 2 (an industry page): only this industry's stories. A story that matches
 * no industry at all is held back as padding — it never displaces an on-topic
 * story, it only fills the page when the signature matched almost nothing.
 */
export function filterIndustryArticles(articles: Article[], industryId: string): Article[] {
  const onTopic: Article[] = [];

  for (const article of articles) {
    const match = matchIndustry(article.originalTitle || article.title);
    if (match?.industry === industryId) onTopic.push(article);
  }

  return onTopic;
}

/**
 * Level 3 (a sub-section of an industry, e.g. SaaS & Products). Sibling
 * industries are dropped; a story whose headline matches *this* sub-section's own
 * keywords stays even when another industry's signature claims it more strongly,
 * because that is exactly what the reader opened the page for ("food processing"
 * is listed under Culinary & Hospitality and also names the agriculture section).
 * The industry's other stories only pad a page the sub-section cannot fill.
 */
export function filterSubSectionArticles(
  articles: Article[],
  industryId: string,
  subId: string,
): Article[] {
  const onTopic: Article[] = [];
  const rest: Article[] = [];
  const neutral: Article[] = [];

  for (const article of articles) {
    const match = matchIndustry(article.originalTitle || article.title);
    if (subSectionScore(article.originalTitle || article.title, industryId, subId) > 0) {
      onTopic.push(article);
    } else if (match && match.industry !== industryId) {
      continue;
    } else if (match) {
      rest.push(article);
    } else {
      neutral.push(article);
    }
  }

  if (onTopic.length >= MIN_SUB_ARTICLES) return onTopic;
  return [...onTopic, ...rest, ...neutral];
}

/**
 * The industry section's own landing page: keep anything that reads as industry
 * news at all, so the directory is not the front page under another name.
 */
export function filterAnyIndustryArticles(articles: Article[], min = MIN_ANY_ARTICLES): Article[] {
  const onTopic: Article[] = [];
  const neutral: Article[] = [];

  for (const article of articles) {
    if (matchIndustry(article.originalTitle || article.title)) onTopic.push(article);
    else neutral.push(article);
  }

  if (onTopic.length >= min || neutral.length === 0) return onTopic;
  return [...onTopic, ...neutral];
}
