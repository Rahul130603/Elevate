/**
 * End-to-end smoke test against a running server.
 *
 *   npm start            # in one terminal
 *   npm run verify       # in another
 *
 * Set BASE_URL to point at a different port/host.
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, { redirect: "manual", ...init });
  const text = await response.text();
  return { status: response.status, location: response.headers.get("location"), type: response.headers.get("content-type") || "", text };
}

function expect(name, condition, detail) {
  record(name, Boolean(condition), condition ? detail : `unexpected: ${detail}`);
}

const LOCALE_CASES = [
  { lang: "en", marker: "Top Stories" },
  { lang: "hi", marker: "मुख्य समाचार" },
  { lang: "ta", marker: "முக்கிய செய்திகள்" },
  { lang: "bn", marker: "প্রধান খবর" },
  { lang: "ml", marker: "പ്രധാന വാർത്തകൾ" },
  { lang: "gu", marker: "મુખ્ય સમાચાર" },
  { lang: "mr", marker: "मुख्य बातम्या" },
];

console.log(`\nVerifying ${BASE}\n${"-".repeat(60)}`);

// 1. Language negotiation
const root = await get("/");
expect("GET / redirects", root.status === 307 || root.status === 302, `${root.status} -> ${root.location}`);
expect("GET / lands on a locale", /\/(en|hi|ta|bn|ml|gu|mr)$/.test(root.location || ""), root.location || "");

const tamilRoot = await get("/", { headers: { "accept-language": "ta-IN,ta;q=0.9,en;q=0.5" } });
expect("Accept-Language: ta -> /ta", (tamilRoot.location || "").endsWith("/ta"), tamilRoot.location || "");

// 2. Every language front page
for (const { lang, marker } of LOCALE_CASES) {
  const page = await get(`/${lang}`);
  const hasMarker = page.text.includes(marker);
  const hasLang = page.text.includes(`lang="${lang}"`);
  const hasAlternates = /hreflang="ta-IN"/i.test(page.text) && /hreflang="x-default"/i.test(page.text);
  const hasTicker = page.text.includes("animate-ticker");
  // Internal story links, not Google's: a keyed provider (GNews/NewsData)
  // supplies real publisher URLs, so the old google.com pattern would be zero.
  const storyLinks = (page.text.match(/\/story\//g) || []).length;

  expect(
    `/${lang} renders (${lang})`,
    page.status === 200 && hasMarker && hasLang && hasAlternates && hasTicker && storyLinks > 5,
    `status=${page.status} marker=${hasMarker} lang=${hasLang} hreflang=${hasAlternates} ticker=${hasTicker} stories=${storyLinks}`,
  );
}

// 3. Section pages
for (const [path, marker] of [
  ["/en/business", "Business"],
  ["/hi/business", "कारोबार"],
  ["/ta/technology", "தொழில்நுட்பம்"],
  ["/en/legal", "Legal"],
  ["/en/politics", "Politics"],
  ["/ml/health", "ആരോഗ്യം"],
]) {
  const page = await get(path);
  expect(`GET ${path}`, page.status === 200 && page.text.includes(marker), `status=${page.status} marker=${page.text.includes(marker)}`);
}

// 4. Redirects
const topRedirect = await get("/en/top");
expect("GET /en/top -> /en", topRedirect.status === 307 && (topRedirect.location || "").endsWith("/en"), `${topRedirect.status} -> ${topRedirect.location}`);

const shortLink = await get("/business");
expect("GET /business -> /en/business", (shortLink.location || "").endsWith("/en/business"), `${shortLink.status} -> ${shortLink.location}`);

const deepLink = await get("/en/business/extra/segments");
expect("deep unknown path folds back", (deepLink.location || "").endsWith("/en"), `${deepLink.status} -> ${deepLink.location}`);

const unknownSection = await get("/en/not-a-section");
expect("unknown section 404s", unknownSection.status === 404 && unknownSection.text.includes("404"), `status=${unknownSection.status}`);

const localizedNotFound = await get("/ta/not-a-section");
expect(
  "404 is localised",
  localizedNotFound.status === 404 && localizedNotFound.text.includes("பக்கம் கிடைக்கவில்லை"),
  `status=${localizedNotFound.status}`,
);

// 5. Search
const search = await get("/en/search?q=budget");
expect("GET /en/search?q=budget", search.status === 200 && /\/story\//.test(search.text), `status=${search.status} results=${(search.text.match(/\/story\//g) || []).length}`);
const searchEmpty = await get("/en/search");
expect("GET /en/search (no query) shows guidance", searchEmpty.status === 200 && searchEmpty.text.includes("Try a topic"), `status=${searchEmpty.status}`);

// 6. Feeds + SEO endpoints
const rss = await get("/ta/rss.xml");
expect("GET /ta/rss.xml", rss.status === 200 && rss.text.includes("<rss") && rss.text.includes("<item>"), `status=${rss.status} type=${rss.type}`);

const sitemap = await get("/sitemap.xml");
expect(
  "GET /sitemap.xml covers all languages",
  sitemap.status === 200 && LOCALE_CASES.every(({ lang }) => sitemap.text.includes(`/${lang}/business`)),
  `status=${sitemap.status} entries=${(sitemap.text.match(/<url>/g) || []).length}`,
);
expect(
  "sitemap includes sub-categories",
  sitemap.text.includes("/technology/artificial-intelligence") &&
    sitemap.text.includes("/legal/supreme-court"),
  `${(sitemap.text.match(/<url>/g) || []).length} urls`,
);

const robots = await get("/robots.txt");
expect("GET /robots.txt", robots.status === 200 && robots.text.includes("Sitemap:"), `status=${robots.status}`);

const icon = await get("/icon.png");
expect("GET /icon.png", icon.status === 200 && icon.type.includes("png"), `status=${icon.status}`);

// 7. Category structure: sections, sub-categories and the mega menu
const SECTIONS = ["politics", "world", "technology", "science", "sports", "business", "legal", "health"];
const SUBS = [
  "politics/national-politics",
  "technology/artificial-intelligence",
  "science/space-astronomy",
  "sports/cricket",
  "business/stock-market",
  "legal/supreme-court",
  "health/mental-health",
];

for (const section of SECTIONS) {
  const page = await get(`/en/${section}`);
  expect(
    `GET /en/${section}`,
    page.status === 200 && page.text.includes(`/en/${section}/`) ,
    `status=${page.status} subLinks=${(page.text.match(new RegExp(`/en/${section}/[a-z-]+`, "g")) || []).length}`,
  );
}

for (const sub of SUBS) {
  const page = await get(`/en/${sub}`);
  expect(
    `GET /en/${sub}`,
    page.status === 200 && page.text.includes('aria-label="Breadcrumb"') && /\/story\//.test(page.text),
    `status=${page.status} stories=${(page.text.match(/\/story\//g) || []).length}`,
  );
}

const invalidSub = await get("/en/technology/not-a-real-sub");
expect("invalid sub-category 404s", invalidSub.status === 404, `status=${invalidSub.status}`);

// 7b. Industry: the nav section, its default feed and a couple of its industries
const industry = await get("/en/industry");
expect(
  "GET /en/industry (finance by default, industries listed)",
  industry.status === 200 &&
    industry.text.includes("Finance &amp; Banking") &&
    industry.text.includes("IT &amp; Software") &&
    industry.text.includes("Publishing"),
  `status=${industry.status} industries=${(industry.text.match(new RegExp("/en/industry/[a-z-]+", "g")) || []).length}`,
);

for (const slug of ["finance", "it-software", "publishing", "culinary-hospitality", "healthcare-medical"]) {
  const page = await get(`/en/industry/${slug}`);
  expect(
    `GET /en/industry/${slug}`,
    page.status === 200 && page.text.includes('aria-label="Breadcrumb"') && /\/story\//.test(page.text),
    `status=${page.status} stories=${(page.text.match(/\/story\//g) || []).length}`,
  );
}

// Third level: an industry's own sub-sections (Medical -> Pharmacy, …)
for (const [industry, speciality, label] of [
  ["healthcare-medical", "pharmacy", "Pharmacy"],
  ["healthcare-medical", "physiotherapy", "Physiotherapy"],
  ["it-software", "cybersecurity", "Cybersecurity"],
  ["publishing", "books", "Books"],
]) {
  const page = await get(`/en/industry/${industry}/${speciality}`);
  expect(
    `GET /en/industry/${industry}/${speciality}`,
    page.status === 200 && page.text.includes(label) && /\/story\//.test(page.text),
    `status=${page.status} stories=${(page.text.match(/\/story\//g) || []).length}`,
  );
}

const invalidSpeciality = await get("/en/industry/healthcare-medical/not-a-real-field");
expect(
  "unknown sub-section folds back to the locale front page",
  invalidSpeciality.status === 307 || invalidSpeciality.status === 308,
  `status=${invalidSpeciality.status} location=${invalidSpeciality.location}`,
);

const industryTa = await get("/ta/industry");
expect(
  "industry section is localised",
  industryTa.status === 200 && industryTa.text.includes("தொழில் துறை"),
  `status=${industryTa.status}`,
);

// An industry page must lead with *its own* sections, not the sibling industries.
const animationIndustry = await get("/en/industry/animation-vfx");
expect(
  "industry page lists its own sections",
  animationIndustry.status === 200 &&
    animationIndustry.text.includes("/en/industry/animation-vfx/gaming") &&
    animationIndustry.text.includes("/en/industry/animation-vfx/post-production"),
  `status=${animationIndustry.status} ownSections=${(animationIndustry.text.match(/\/en\/industry\/animation-vfx\/[a-z-]+/g) || []).length}`,
);

const medicalIndustry = await get("/en/industry/healthcare-medical");
expect(
  "Medical offers Pharmacy and Physiotherapy",
  medicalIndustry.status === 200 &&
    medicalIndustry.text.includes("/en/industry/healthcare-medical/pharmacy") &&
    medicalIndustry.text.includes("/en/industry/healthcare-medical/physiotherapy"),
  `status=${medicalIndustry.status}`,
);

const manifest = await get("/manifest.webmanifest");
expect(
  "GET /manifest.webmanifest (must not be locale-redirected)",
  manifest.status === 200 && manifest.text.includes('"name"'),
  `status=${manifest.status}`,
);

// Weather: the chip in the masthead and the weather page
const weatherPage = await get("/en/weather");
expect(
  "GET /en/weather (cities + weather news)",
  weatherPage.status === 200 &&
    weatherPage.text.includes("Weather in major Indian cities") &&
    weatherPage.text.includes("Latest weather news") &&
    ["Mumbai", "Chennai", "Kolkata"].every((city) => weatherPage.text.includes(city)) &&
    // React splits "28°" and "C" with a comment node, so count the degree signs.
    (weatherPage.text.match(/°/g) || []).length >= 10,
  `status=${weatherPage.status} temps=${(weatherPage.text.match(/°/g) || []).length}`,
);

const weatherTa = await get("/ta/weather");
expect(
  "GET /ta/weather (localised)",
  weatherTa.status === 200 && weatherTa.text.includes("வானிலை"),
  `status=${weatherTa.status}`,
);

const homeWithChip = await get("/en");
expect(
  "masthead weather chip links to the weather page",
  homeWithChip.text.includes('href="/en/weather"'),
  `weatherLink=${homeWithChip.text.includes('href="/en/weather"')}`,
);

// State -> city selector on the weather page
expect(
  "weather page state/city selector",
  weatherPage.text.includes("Check weather in your city") &&
    weatherPage.text.includes("Select state") &&
    weatherPage.text.includes("Select city") &&
    ["Tamil Nadu", "Kerala", "Maharashtra"].every((state) => weatherPage.text.includes(state)) &&
    weatherPage.text.includes("UV index") &&
    weatherPage.text.includes("Sunrise"),
  `selector=${weatherPage.text.includes("Check weather in your city")}`,
);

expect(
  "header search box removed",
  !homeWithChip.text.includes('data-testid="search-form"'),
  `searchFormPresent=${homeWithChip.text.includes('data-testid="search-form"')}`,
);

const techPage = await get("/en");
const desktopTriggers = (techPage.text.match(/aria-controls="section-mega-menu"/g) || []).length;
expect(
  "navigation: Industry entry + mobile drawer trigger (topic sections hidden)",
  desktopTriggers >= 1 &&
    techPage.text.includes('aria-controls="mobile-drawer"') &&
    techPage.text.includes("Industry") &&
    !techPage.text.includes(">Politics<"),
  `desktopTriggers=${desktopTriggers} industry=${techPage.text.includes("Industry")} politicsShown=${techPage.text.includes(">Politics<")}`,
);

// 8. Dark mode / theme plumbing
const home = await get("/en");
expect("theme bootstrap script present", home.text.includes("localStorage.getItem(\"theme\")"), "inline theme script");
expect("language switcher lists 7 languages", LOCALE_CASES.every(({ lang }) => home.text.includes(`/${lang}"`)), "switcher links");
expect(
  "masthead renders (name, Industry button, search)",
  home.text.includes("Elevate") && home.text.includes("Industry") && home.text.includes('aria-label="Search"'),
  "masthead parts",
);

const searchPage = await get("/en/search");
expect(
  "search page still available (header box removed on request)",
  searchPage.status === 200 && searchPage.text.includes('data-testid="search-form"'),
  `status=${searchPage.status}`,
);

console.log(`${"-".repeat(60)}`);
const failed = results.filter((entry) => !entry.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed\n`);

if (failed.length > 0) {
  console.log("Failures:");
  for (const entry of failed) console.log(`  - ${entry.name}: ${entry.detail}`);
  process.exit(1);
}
