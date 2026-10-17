/**
 * Site taxonomy: 7 sections, each with its own sub-categories.
 *
 * Google News has no topic feed for most of this taxonomy, so every sub-category
 * is backed by a Google News *search* feed (verified to return localised results
 * in all 7 editions even though the queries are English). Sections use Google's
 * own topic feeds where one exists — that is better editorial quality than a
 * keyword search.
 */

export type FeedSpec =
  | { kind: "topic"; topic: string }
  | { kind: "query"; query: string };

export type SubCategory = {
  /** URL slug: /<locale>/<section>/<id> or /<locale>/<section>/<parent>/<id> */
  id: string;
  /** English label. Localised names can be layered on in i18n without changing URLs. */
  label: string;
  feed: FeedSpec;
  /** Third level, used by the industry section (e.g. Medical -> Pharmacy). */
  subs?: readonly SubCategory[];
};

export type SectionId =
  | "industry"
  | "politics"
  | "world"
  | "technology"
  | "science"
  | "sports"
  | "business"
  | "legal"
  | "health";

export type Section = {
  id: SectionId;
  feed: FeedSpec;
  /** Artwork hue used for story cards in this section. */
  hue: number;
  description: string;
  subs: readonly SubCategory[];
};

/** `top` is the front page — not a nav section, but it is a feed. */
export type Category = SectionId | "top";

export const DEFAULT_CATEGORY: Category = "top";

const query = (value: string): FeedSpec => ({ kind: "query", query: value });

export const SECTIONS: readonly Section[] = [
  {
    /*
     * The site's front navigation: one "Industry" entry whose dropdown lists the
     * industries below. Opening /<locale>/industry shows the industry directory
     * (every industry with its sub-sections) plus news pooled from all of them;
     * `feed` is only a fallback for surfaces that need one query per section.
     */
    id: "industry",
    feed: query("finance banking markets industry"),
    hue: 232,
    description: "News by industry: finance, IT, publishing, hospitality, healthcare and more",
    subs: [
      {
        id: "finance",
        label: "Finance & Banking",
        feed: query("finance banking markets industry"),
        subs: [
          { id: "banking", label: "Banking", feed: query("banking sector news") },
          { id: "markets", label: "Markets & Stocks", feed: query("stock market shares markets") },
          { id: "insurance", label: "Insurance", feed: query("insurance industry") },
          { id: "nbfc", label: "NBFC & Lending", feed: query("nbfc lending microfinance") },
          { id: "payments", label: "Payments & Fintech", feed: query("payments fintech upi") },
          { id: "mutual-funds", label: "Mutual Funds", feed: query("mutual funds amc investment") },
          { id: "wealth-management", label: "Wealth Management", feed: query("wealth management portfolio advisors") },
          { id: "private-equity", label: "Private Equity & VC", feed: query("private equity venture capital funding") },
          { id: "taxation", label: "Taxation & GST", feed: query("income tax gst filing compliance") },
          { id: "pension", label: "Pension & Retirement", feed: query("pension nps retirement fund") },
          {
            id: "earnings-deals",
            label: "Earnings & Deals",
            feed: query("bank earnings quarterly results mergers acquisitions"),
          },
        ],
      },
      {
        id: "it-software",
        label: "IT & Software",
        feed: query("IT software services industry exports"),
        subs: [
          { id: "software-services", label: "IT Services", feed: query("IT services outsourcing companies") },
          { id: "saas", label: "SaaS & Products", feed: query("saas software product startup") },
          { id: "ai-ml", label: "AI & Machine Learning", feed: query("artificial intelligence machine learning industry") },
          { id: "cybersecurity", label: "Cybersecurity", feed: query("cybersecurity data breach industry") },
          { id: "cloud", label: "Cloud & Data Centres", feed: query("cloud computing data centre") },
          { id: "fintech-software", label: "Fintech Software", feed: query("fintech software platform") },
          { id: "data-analytics", label: "Data & Analytics", feed: query("data analytics big data platforms") },
          { id: "enterprise-erp", label: "Enterprise & ERP", feed: query("erp enterprise software companies") },
          { id: "gcc", label: "GCC & Captives", feed: query("global capability centres gcc india") },
          { id: "it-hiring", label: "IT Hiring & Jobs", feed: query("IT hiring jobs attrition employees") },
          { id: "it-finance", label: "IT Finance & Deals", feed: query("IT services company earnings revenue outsourcing deals") },
        ],
      },
      {
        id: "publishing",
        label: "Publishing",
        feed: query("book publishing industry"),
        subs: [
          { id: "books", label: "Books", feed: query("book publishing authors") },
          { id: "magazines", label: "Magazines", feed: query("magazines periodicals publishing") },
          { id: "academic", label: "Academic & Journals", feed: query("academic journals research publishing") },
          { id: "educational", label: "Educational", feed: query("educational publishing textbooks curriculum") },
          {
            id: "professional-technical",
            label: "Professional & Technical",
            feed: query("professional technical publishing books"),
          },
          { id: "digital", label: "Digital", feed: query("digital publishing ebooks platforms") },
          {
            id: "printing-pod",
            label: "Printing & POD",
            feed: query("printing presses print on demand publishing"),
          },
          { id: "self-publishing", label: "Self-Publishing", feed: query("self publishing indie authors") },
          {
            id: "scientific-medical",
            label: "Scientific & Medical",
            feed: query("scientific medical publishing journals"),
          },
          {
            id: "accessibility",
            label: "Accessibility",
            feed: query("accessible books publishing accessibility"),
          },
          {
            id: "publishing-finance",
            label: "Publishing Finance",
            feed: query("book publisher revenue earnings publishing acquisition"),
          },
        ],
      },
      {
        id: "culinary-hospitality",
        label: "Culinary & Hospitality",
        feed: query("restaurant hotel hospitality industry"),
        subs: [
          { id: "restaurants", label: "Restaurants", feed: query("restaurant industry food") },
          { id: "cloud-kitchens", label: "Cloud Kitchens", feed: query("cloud kitchen food delivery") },
          { id: "catering", label: "Catering", feed: query("catering services events food") },
          { id: "hotels", label: "Hotels & Resorts", feed: query("hotels resorts hospitality") },
          { id: "bakery", label: "Bakery & Confectionery", feed: query("bakery confectionery sweets") },
          { id: "food-processing", label: "Food Processing", feed: query("food processing industry packaged") },
          { id: "cafes-qsr", label: "Cafes & QSR", feed: query("cafe coffee chain qsr outlets") },
          { id: "food-safety", label: "Food Safety & FSSAI", feed: query("fssai food safety standards hygiene") },
          { id: "bars-beverages", label: "Bars & Beverages", feed: query("bar pub liquor beverages alcohol policy") },
          { id: "packaged-gourmet", label: "Packaged & Gourmet", feed: query("gourmet packaged food premium brands") },
          {
            id: "hospitality-finance",
            label: "Hospitality Finance",
            feed: query("restaurant hotel revenue funding investment deals"),
          },
        ],
      },
      {
        id: "healthcare-medical",
        label: "Healthcare & Medical",
        feed: query("healthcare hospitals pharma industry"),
        subs: [
          { id: "pharmacy", label: "Pharmacy", feed: query("pharmacy medicines pharma retail") },
          { id: "physiotherapy", label: "Physiotherapy", feed: query("physiotherapy rehabilitation therapy") },
          { id: "nursing", label: "Nursing", feed: query("nursing nurses healthcare") },
          { id: "diagnostics", label: "Diagnostics & Labs", feed: query("diagnostics labs medical testing") },
          { id: "hospital-management", label: "Hospital Management", feed: query("hospital management healthcare services") },
          { id: "medical-devices", label: "Medical Devices", feed: query("medical devices equipment industry") },
          { id: "dental", label: "Dental", feed: query("dental care dentistry industry") },
          { id: "ayurveda", label: "Ayurveda & Wellness", feed: query("ayurveda homeopathy wellness industry") },
          { id: "telemedicine", label: "Telemedicine & Digital Health", feed: query("telemedicine digital health startups") },
          { id: "mental-health", label: "Mental Health", feed: query("mental health counselling psychiatry") },
          {
            id: "healthcare-finance",
            label: "Healthcare Finance",
            feed: query("hospital healthcare revenue funding investment deals"),
          },
        ],
      },
      {
        id: "manufacturing",
        label: "Manufacturing",
        feed: query("manufacturing factory industry"),
        subs: [
          { id: "engineering", label: "Engineering", feed: query("engineering manufacturing industry") },
          { id: "electronics", label: "Electronics", feed: query("electronics manufacturing components") },
          { id: "machinery", label: "Machinery & Equipment", feed: query("machinery equipment industry") },
          { id: "chemicals", label: "Chemicals", feed: query("chemicals industry petrochemicals") },
          { id: "steel", label: "Steel & Metals", feed: query("steel metals industry") },
          { id: "plastics", label: "Plastics & Packaging", feed: query("plastics packaging industry") },
          { id: "automation-robotics", label: "Automation & Robotics", feed: query("industrial automation robotics factory") },
          { id: "semiconductors", label: "Semiconductors & Chips", feed: query("semiconductor chip fab manufacturing") },
          { id: "defence-manufacturing", label: "Defence Manufacturing", feed: query("defence manufacturing production exports") },
          { id: "industrial-policy", label: "Industrial Policy & PLI", feed: query("pli scheme industrial policy manufacturing") },
          {
            id: "manufacturing-finance",
            label: "Manufacturing Finance",
            feed: query("manufacturing capex investment funding plant expansion"),
          },
        ],
      },
      {
        id: "retail-ecommerce",
        label: "Retail & E-commerce",
        feed: query("retail ecommerce industry sales"),
        subs: [
          { id: "retail", label: "Retail", feed: query("retail industry stores sales") },
          { id: "ecommerce", label: "E-commerce", feed: query("ecommerce online shopping platforms") },
          { id: "quick-commerce", label: "Quick Commerce", feed: query("quick commerce instant delivery") },
          { id: "fashion-retail", label: "Fashion Retail", feed: query("fashion retail brands stores") },
          { id: "grocery", label: "Grocery & Supermarkets", feed: query("grocery supermarket retail") },
          { id: "d2c", label: "D2C Brands", feed: query("d2c direct to consumer brands") },
          { id: "luxury-retail", label: "Luxury & Premium Retail", feed: query("luxury premium brands retail") },
          { id: "b2b-wholesale", label: "B2B & Wholesale", feed: query("b2b wholesale commerce distributors") },
          { id: "retail-tech", label: "Retail Tech & POS", feed: query("retail technology pos software stores") },
          { id: "consumer-durables", label: "Consumer Durables", feed: query("consumer durables electronics retail sales") },
          { id: "retail-finance", label: "Retail Finance", feed: query("retail chain revenue earnings store expansion investment") },
        ],
      },
      {
        id: "real-estate",
        label: "Real Estate & Construction",
        feed: query("real estate construction housing industry"),
        subs: [
          { id: "housing", label: "Housing", feed: query("housing real estate market") },
          { id: "commercial", label: "Commercial Property", feed: query("commercial real estate offices") },
          { id: "infrastructure", label: "Infrastructure", feed: query("infrastructure projects construction") },
          { id: "cement", label: "Cement & Materials", feed: query("cement construction materials") },
          { id: "interiors", label: "Interiors & Design", feed: query("interior design industry") },
          { id: "proptech", label: "PropTech", feed: query("proptech real estate technology") },
          { id: "rental-coliving", label: "Rental & Co-living", feed: query("rental housing co-living coworking") },
          { id: "green-building", label: "Green Building", feed: query("green building sustainable construction") },
          { id: "construction-equipment", label: "Construction Equipment", feed: query("construction equipment machinery technology") },
          { id: "township-plots", label: "Township & Plots", feed: query("township plotted development projects") },
          {
            id: "real-estate-finance",
            label: "Real Estate Finance",
            feed: query("housing finance company home loan real estate funding"),
          },
        ],
      },
      {
        id: "education-edtech",
        label: "Education & EdTech",
        feed: query("edtech education industry schools"),
        subs: [
          { id: "schools", label: "Schools", feed: query("schools education sector") },
          { id: "higher-education", label: "Higher Education", feed: query("colleges universities education") },
          { id: "edtech", label: "EdTech", feed: query("edtech online learning") },
          { id: "coaching", label: "Coaching & Test Prep", feed: query("coaching test preparation industry") },
          { id: "skills", label: "Skills & Certification", feed: query("skill training certification") },
          { id: "study-abroad", label: "Study Abroad", feed: query("study abroad students education") },
          { id: "early-childhood", label: "Early Childhood", feed: query("preschool early childhood education") },
          { id: "board-schools", label: "International & Board Schools", feed: query("cbse icse ib international schools") },
          { id: "scholarships", label: "Scholarships", feed: query("scholarship education funding students") },
          { id: "student-loans", label: "Student Loans", feed: query("education loan student finance") },
          {
            id: "education-finance",
            label: "Education Finance",
            feed: query("education funding edtech investment student loans"),
          },
        ],
      },
      {
        id: "media-entertainment",
        label: "Media & Entertainment",
        feed: query("media entertainment industry streaming"),
        subs: [
          { id: "film", label: "Film", feed: query("film cinema industry box office") },
          { id: "ott", label: "OTT & Streaming", feed: query("ott streaming platforms") },
          { id: "television", label: "Television", feed: query("television broadcasting channels") },
          { id: "music", label: "Music", feed: query("music industry labels") },
          { id: "radio-podcast", label: "Radio & Podcasts", feed: query("radio podcast industry") },
          { id: "events", label: "Events & Live", feed: query("events live entertainment industry") },
          { id: "awards-festivals", label: "Awards & Festivals", feed: query("film awards festival entertainment") },
          { id: "media-deals", label: "Media Deals & M&A", feed: query("media mergers acquisitions deals") },
          { id: "celebrity", label: "Celebrity", feed: query("celebrity entertainment news") },
          { id: "sports-media", label: "Sports Media & Rights", feed: query("sports broadcasting rights media deals") },
          {
            id: "media-finance",
            label: "Media Finance",
            feed: query("media entertainment revenue earnings funding deals"),
          },
        ],
      },
      {
        id: "logistics",
        label: "Logistics & Transport",
        feed: query("logistics shipping transport industry"),
        subs: [
          { id: "shipping", label: "Shipping & Ports", feed: query("shipping ports logistics") },
          { id: "road-transport", label: "Road Transport", feed: query("road transport trucking industry") },
          { id: "aviation", label: "Aviation", feed: query("aviation airlines sector") },
          { id: "railways", label: "Railways & Freight", feed: query("railways freight corridors") },
          { id: "warehousing", label: "Warehousing", feed: query("warehousing supply chain") },
          { id: "delivery", label: "Courier & Delivery", feed: query("courier delivery services") },
          { id: "cold-chain", label: "Cold Chain", feed: query("cold chain logistics storage") },
          { id: "metro-urban", label: "Metro & Urban Transport", feed: query("metro urban transport bus services") },
          { id: "trade-customs", label: "Trade & Customs", feed: query("customs import export trade policy") },
          { id: "third-party-logistics", label: "3PL & Supply Chain", feed: query("3pl supply chain management logistics") },
          {
            id: "logistics-finance",
            label: "Logistics Finance",
            feed: query("logistics funding investment freight rates revenue"),
          },
        ],
      },
      {
        id: "energy",
        label: "Energy & Utilities",
        feed: query("energy power renewable sector"),
        subs: [
          { id: "power", label: "Power", feed: query("power sector electricity generation") },
          { id: "renewables", label: "Renewables", feed: query("renewable energy solar wind") },
          { id: "oil-gas", label: "Oil & Gas", feed: query("oil gas sector refining") },
          { id: "water", label: "Water & Utilities", feed: query("water utilities management") },
          { id: "ev-charging", label: "EV & Charging", feed: query("electric vehicles charging infrastructure") },
          { id: "waste", label: "Waste & Recycling", feed: query("waste management recycling industry") },
          { id: "energy-storage", label: "Energy Storage & Batteries", feed: query("battery energy storage bess grid") },
          { id: "green-hydrogen", label: "Green Hydrogen", feed: query("green hydrogen electrolyser projects") },
          { id: "coal-mining", label: "Coal & Mining", feed: query("coal mining production blocks") },
          { id: "tariffs-regulation", label: "Tariffs & Regulation", feed: query("electricity tariff regulator policy") },
          {
            id: "energy-finance",
            label: "Energy Finance",
            feed: query("energy investment funding capex green finance deals"),
          },
        ],
      },
      {
        id: "agriculture-food",
        label: "Agriculture & Food Processing",
        feed: query("agribusiness food processing industry"),
        subs: [
          { id: "farming", label: "Farming", feed: query("agriculture farming sector crops") },
          { id: "agritech", label: "AgriTech", feed: query("agritech farm technology") },
          { id: "dairy", label: "Dairy", feed: query("dairy industry milk products") },
          { id: "fisheries", label: "Fisheries", feed: query("fisheries aquaculture exports") },
          { id: "food-exports", label: "Food Exports", feed: query("food processing exports") },
          { id: "agri-inputs", label: "Agri Inputs", feed: query("fertiliser seeds agri inputs") },
          { id: "poultry-meat", label: "Poultry & Meat", feed: query("poultry meat processing exports") },
          { id: "horticulture", label: "Horticulture", feed: query("horticulture fruits vegetables production") },
          { id: "sugar-ethanol", label: "Sugar & Ethanol", feed: query("sugar mills ethanol blending") },
          { id: "farm-machinery", label: "Farm Machinery", feed: query("tractor farm equipment machinery") },
          { id: "agri-finance", label: "Agri Finance", feed: query("agri finance farm loans credit subsidy") },
        ],
      },
      {
        id: "automobile",
        label: "Automobile",
        feed: query("automobile car industry sales"),
        subs: [
          { id: "cars", label: "Cars", feed: query("car industry sales launches") },
          { id: "two-wheelers", label: "Two-wheelers", feed: query("two wheeler bike scooter industry") },
          { id: "commercial-vehicles", label: "Commercial Vehicles", feed: query("commercial vehicles trucks industry") },
          { id: "auto-components", label: "Auto Components", feed: query("auto components parts suppliers") },
          { id: "ev-auto", label: "Electric Vehicles", feed: query("electric vehicles auto industry") },
          { id: "tyres", label: "Tyres", feed: query("tyres industry auto") },
          { id: "luxury-cars", label: "Luxury Cars", feed: query("luxury cars premium auto brands") },
          { id: "used-cars", label: "Used Cars", feed: query("used car market resale pre-owned") },
          { id: "aftermarket", label: "Aftermarket & Service", feed: query("auto aftermarket spare parts service") },
          { id: "auto-tech", label: "Auto Tech & Software", feed: query("connected car software auto technology") },
          { id: "auto-finance", label: "Auto Finance", feed: query("auto finance vehicle loans car loan NBFC") },
        ],
      },
      {
        id: "textiles-apparel",
        label: "Textiles & Apparel",
        feed: query("textile apparel garment industry"),
        subs: [
          { id: "garments", label: "Garments", feed: query("garment apparel exports") },
          { id: "spinning", label: "Spinning & Yarn", feed: query("spinning yarn textile mills") },
          { id: "handloom", label: "Handloom & Handicrafts", feed: query("handloom handicrafts textiles") },
          { id: "fashion", label: "Fashion", feed: query("fashion apparel brands industry") },
          { id: "footwear", label: "Footwear", feed: query("footwear industry shoes") },
          { id: "technical-textiles", label: "Technical Textiles", feed: query("technical textiles industry") },
          { id: "home-textiles", label: "Home Textiles", feed: query("home textiles furnishings exports") },
          { id: "dyeing-processing", label: "Dyeing & Processing", feed: query("textile processing dyeing units") },
          { id: "sustainable-textiles", label: "Sustainable Textiles", feed: query("organic cotton sustainable textiles recycling") },
          { id: "wool-silk", label: "Wool & Silk", feed: query("wool silk textiles production") },
          {
            id: "textile-finance",
            label: "Textile Finance",
            feed: query("textile industry credit funding investment export finance"),
          },
        ],
      },
      {
        id: "travel-tourism",
        label: "Travel & Tourism",
        feed: query("travel tourism airline hospitality sector"),
        subs: [
          { id: "tourism", label: "Tourism", feed: query("tourism travel sector arrivals") },
          { id: "travel-tech", label: "Travel Tech", feed: query("travel tech booking platforms") },
          { id: "homestays", label: "Homestays", feed: query("homestay tourism rentals") },
          { id: "pilgrimage", label: "Pilgrimage", feed: query("pilgrimage religious tourism") },
          { id: "cruises", label: "Cruises", feed: query("cruise tourism industry") },
          { id: "mice", label: "MICE & Business Travel", feed: query("business travel conferences mice") },
          { id: "adventure-wildlife", label: "Adventure & Wildlife", feed: query("adventure tourism wildlife safari") },
          { id: "medical-tourism", label: "Medical Tourism", feed: query("medical tourism patients treatment") },
          { id: "visa-immigration", label: "Visa & Immigration", feed: query("visa immigration travel rules") },
          { id: "destination-weddings", label: "Destination Weddings", feed: query("destination wedding travel venues") },
          {
            id: "travel-finance",
            label: "Travel Finance",
            feed: query("travel tourism investment funding revenue deals"),
          },
        ],
      },
      {
        id: "advertising-marketing",
        label: "Advertising & Marketing",
        feed: query("advertising marketing agency industry"),
        subs: [
          { id: "advertising", label: "Advertising", feed: query("advertising industry campaigns") },
          { id: "digital-marketing", label: "Digital Marketing", feed: query("digital marketing agency seo") },
          { id: "branding", label: "Branding & Design", feed: query("branding design studios") },
          { id: "pr", label: "PR & Communications", feed: query("public relations industry") },
          { id: "market-research", label: "Market Research", feed: query("market research consumer insights") },
          { id: "influencer", label: "Influencer & Creator", feed: query("influencer marketing creator economy") },
          { id: "media-buying", label: "Media Buying & AdEx", feed: query("media buying ad spend media planning advertising") },
          { id: "sponsorship", label: "Sponsorship & Sports", feed: query("sponsorship sports marketing deals") },
          { id: "adtech", label: "Ad Tech & Programmatic", feed: query("adtech programmatic advertising platforms") },
          { id: "social-marketing", label: "Social Media Marketing", feed: query("social media marketing campaigns brands") },
          {
            id: "agency-finance",
            label: "Agency Finance",
            feed: query("ad agency revenue media agency billing acquisitions"),
          },
        ],
      },
      {
        id: "animation-vfx",
        label: "Animation, VFX & Gaming",
        feed: query("animation vfx gaming studio industry"),
        subs: [
          { id: "animation", label: "Animation", feed: query("animation studios industry") },
          { id: "vfx", label: "VFX", feed: query("visual effects vfx studios") },
          { id: "gaming", label: "Gaming & Esports", feed: query("gaming industry esports") },
          { id: "arvr", label: "AR & VR", feed: query("augmented reality virtual reality industry") },
          { id: "comics", label: "Comics & Illustration", feed: query("comics illustration industry") },
          { id: "post-production", label: "Post-production", feed: query("post production studios audio") },
          { id: "esports", label: "eSports & Tournaments", feed: query("esports tournaments leagues prize") },
          { id: "virtual-production", label: "Virtual Production", feed: query("virtual production led volume 3d") },
          { id: "metaverse-web3", label: "Metaverse & Web3", feed: query("metaverse web3 gaming") },
          { id: "dubbing-localisation", label: "Dubbing & Localisation", feed: query("dubbing voiceover studios entertainment industry") },
          {
            id: "studio-finance",
            label: "Studio Finance",
            feed: query("animation studio funding investment revenue deals"),
          },
        ],
      },
    ],
  },
  {
    id: "politics",
    feed: query("politics"),
    hue: 214,
    description: "Government, elections, parties and diplomacy",
    subs: [
      { id: "national-politics", label: "National Politics", feed: query("national politics") },
      { id: "state-politics", label: "State Politics", feed: query("state politics") },
      { id: "elections", label: "Elections", feed: query("elections") },
      { id: "parliament", label: "Parliament", feed: query("parliament") },
      { id: "government-policies", label: "Government & Policies", feed: query("government policies") },
      { id: "political-parties", label: "Political Parties", feed: query("political parties") },
      { id: "political-leaders", label: "Political Leaders", feed: query("political leaders") },
      { id: "international-politics", label: "International Politics", feed: query("international politics") },
      { id: "diplomacy", label: "Diplomacy", feed: query("diplomacy") },
      { id: "defence-security", label: "Defence & Security", feed: query("defence security") },
    ],
  },
  {
    id: "world",
    feed: { kind: "topic", topic: "WORLD" },
    hue: 212,
    description: "International news and analysis from every region",
    subs: [
      { id: "asia", label: "Asia", feed: query("asia news") },
      { id: "europe", label: "Europe", feed: query("europe news") },
      { id: "americas", label: "Americas", feed: query("americas news") },
      { id: "middle-east", label: "Middle East", feed: query("middle east") },
      { id: "africa", label: "Africa", feed: query("africa news") },
      { id: "australia-pacific", label: "Australia & Pacific", feed: query("australia pacific") },
      { id: "global-economy", label: "Global Economy", feed: query("global economy") },
      { id: "united-nations", label: "United Nations", feed: query("united nations") },
    ],
  },
  {
    id: "technology",
    feed: { kind: "topic", topic: "TECHNOLOGY" },
    hue: 266,
    description: "Gadgets, AI, software and the internet",
    subs: [
      { id: "artificial-intelligence", label: "Artificial Intelligence", feed: query("artificial intelligence") },
      { id: "gadgets", label: "Gadgets", feed: query("gadgets") },
      { id: "smartphones", label: "Smartphones", feed: query("smartphones") },
      { id: "software-apps", label: "Software & Apps", feed: query("software apps") },
      { id: "cybersecurity", label: "Cybersecurity", feed: query("cybersecurity") },
      { id: "startups-innovation", label: "Startups & Innovation", feed: query("startups innovation") },
      { id: "internet-social-media", label: "Internet & Social Media", feed: query("internet social media") },
      { id: "robotics", label: "Robotics", feed: query("robotics") },
      { id: "space-technology", label: "Space Technology", feed: query("space technology") },
      { id: "electric-vehicles", label: "Electric Vehicles & Mobility", feed: query("electric vehicles") },
    ],
  },
  {
    id: "science",
    feed: { kind: "topic", topic: "SCIENCE" },
    hue: 190,
    description: "Space, research, climate and discoveries",
    subs: [
      { id: "space-astronomy", label: "Space & Astronomy", feed: query("space astronomy") },
      { id: "climate-environment", label: "Climate & Environment", feed: query("climate environment") },
      { id: "physics", label: "Physics", feed: query("physics research") },
      { id: "biology", label: "Biology", feed: query("biology") },
      { id: "chemistry", label: "Chemistry", feed: query("chemistry") },
      { id: "scientific-research", label: "Scientific Research", feed: query("scientific research") },
      { id: "earth-geology", label: "Earth & Geology", feed: query("earth science geology") },
      { id: "agriculture-science", label: "Agriculture Science", feed: query("agriculture science") },
      { id: "ocean-marine-science", label: "Ocean & Marine Science", feed: query("ocean marine science") },
      { id: "science-discoveries", label: "Science Discoveries", feed: query("science discoveries") },
    ],
  },
  {
    id: "sports",
    feed: { kind: "topic", topic: "SPORTS" },
    hue: 140,
    description: "Cricket, football, olympics and more",
    subs: [
      { id: "cricket", label: "Cricket", feed: query("cricket") },
      { id: "football", label: "Football", feed: query("football") },
      { id: "tennis", label: "Tennis", feed: query("tennis") },
      { id: "badminton", label: "Badminton", feed: query("badminton") },
      { id: "hockey", label: "Hockey", feed: query("hockey") },
      { id: "basketball", label: "Basketball", feed: query("basketball") },
      { id: "athletics", label: "Athletics", feed: query("athletics") },
      { id: "motorsports", label: "Motorsports", feed: query("motorsports") },
      { id: "olympics", label: "Olympics", feed: query("olympics") },
      { id: "esports", label: "Esports", feed: query("esports") },
    ],
  },
  {
    id: "business",
    feed: { kind: "topic", topic: "BUSINESS" },
    hue: 32,
    description: "Markets, economy, companies and personal finance",
    subs: [
      { id: "stock-market", label: "Stock Market", feed: query("stock market") },
      { id: "economy", label: "Economy", feed: query("economy") },
      { id: "banking", label: "Banking", feed: query("banking") },
      { id: "finance", label: "Finance", feed: query("finance") },
      { id: "startups", label: "Startups", feed: query("startups") },
      { id: "companies", label: "Companies", feed: query("companies") },
      { id: "corporate", label: "Corporate", feed: query("corporate") },
      { id: "real-estate", label: "Real Estate", feed: query("real estate") },
      { id: "ecommerce", label: "E-commerce", feed: query("ecommerce") },
      { id: "personal-finance", label: "Personal Finance", feed: query("personal finance") },
      { id: "jobs-careers", label: "Jobs & Careers", feed: query("jobs careers") },
    ],
  },
  {
    id: "legal",
    feed: query("court"),
    hue: 232,
    description: "Courts, laws and legal affairs",
    subs: [
      { id: "supreme-court", label: "Supreme Court", feed: query("supreme court") },
      { id: "high-courts", label: "High Courts", feed: query("high court") },
      { id: "government-laws", label: "Government Laws", feed: query("new law government") },
      { id: "criminal-law", label: "Criminal Law", feed: query("criminal law") },
      { id: "civil-law", label: "Civil Law", feed: query("civil law") },
      { id: "corporate-law", label: "Corporate Law", feed: query("corporate law") },
      { id: "cyber-law", label: "Cyber Law", feed: query("cyber law") },
      { id: "consumer-law", label: "Consumer Law", feed: query("consumer law") },
      { id: "constitutional-law", label: "Constitutional Law", feed: query("constitutional law") },
      { id: "legal-updates", label: "Legal Updates", feed: query("legal updates") },
    ],
  },
  {
    id: "health",
    feed: { kind: "topic", topic: "HEALTH" },
    hue: 168,
    description: "Public health, medicine and wellbeing",
    subs: [
      { id: "health-news", label: "Health News", feed: query("health news") },
      { id: "diseases-conditions", label: "Diseases & Conditions", feed: query("diseases conditions") },
      { id: "mental-health", label: "Mental Health", feed: query("mental health") },
      { id: "fitness", label: "Fitness", feed: query("fitness") },
      { id: "nutrition", label: "Nutrition", feed: query("nutrition diet") },
      { id: "medical-research", label: "Medical Research", feed: query("medical research") },
      { id: "healthcare", label: "Healthcare", feed: query("healthcare") },
      { id: "medicines-treatments", label: "Medicines & Treatments", feed: query("medicines treatments") },
      { id: "womens-health", label: "Women's Health", feed: query("womens health") },
      { id: "childrens-health", label: "Children's Health", feed: query("childrens health") },
      { id: "public-health", label: "Public Health", feed: query("public health") },
    ],
  },
];

export const SECTION_IDS: readonly SectionId[] = SECTIONS.map((section) => section.id);

/**
 * What the top navigation shows. The older topic sections (politics, world, …)
 * are deliberately kept out of the nav — their pages still work and stay in the
 * sitemap, but the site is navigated by industry now.
 */
export const NAV_SECTION_IDS: readonly SectionId[] = ["industry"];

export const NAV_SECTIONS: readonly Section[] = SECTIONS.filter((section) =>
  (NAV_SECTION_IDS as readonly string[]).includes(section.id),
);

/** Front page first, then the nav sections — the order used by lists and pickers. */
export const CATEGORIES: readonly Category[] = ["top", ...SECTION_IDS];

export const CATEGORY_DESCRIPTION: Record<Category, string> = {
  top: "Top stories from India and around the world",
  ...(Object.fromEntries(SECTIONS.map((section) => [section.id, section.description])) as Record<
    SectionId,
    string
  >),
};

export function isCategory(value: string | undefined): value is Category {
  return !!value && (CATEGORIES as readonly string[]).includes(value);
}

export function isSection(value: string | undefined): value is SectionId {
  return !!value && (SECTION_IDS as readonly string[]).includes(value);
}

export function getSection(id: SectionId): Section {
  return SECTIONS.find((section) => section.id === id) ?? SECTIONS[0];
}

export function getSubCategory(section: SectionId, subId: string): SubCategory | undefined {
  return getSection(section).subs.find((sub) => sub.id === subId);
}

/** Third level lookup: section -> sub-category -> sub-sub-category. */
export function getSpeciality(section: SectionId, subId: string, specialityId: string): SubCategory | undefined {
  return getSubCategory(section, subId)?.subs?.find((entry) => entry.id === specialityId);
}

export function categoryHue(category: Category): number {
  return category === "top" ? 20 : getSection(category).hue;
}

/** `/en`, `/en/technology` */
export function categoryHref(locale: string, category: Category): string {
  return category === "top" ? `/${locale}` : `/${locale}/${category}`;
}

/** `/en/technology/artificial-intelligence` */
export function subCategoryHref(locale: string, section: SectionId, subId: string): string {
  return `/${locale}/${section}/${subId}`;
}

/** `/en/industry/healthcare-medical/pharmacy` */
export function specialityHref(locale: string, section: SectionId, subId: string, specialityId: string): string {
  return `/${locale}/${section}/${subId}/${specialityId}`;
}
