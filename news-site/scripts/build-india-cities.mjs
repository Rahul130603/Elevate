/**
 * Generator: builds src/lib/india-cities.ts (state -> cities with coordinates).
 *
 * City names are curated here; the coordinates come from the keyless Open-Meteo
 * geocoding API and are baked in, so the running site never has to look them up.
 * Re-run with:  node scripts/build-india-cities.mjs
 */
import { writeFile } from "node:fs/promises";

const STATES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada", "Anantapur", "Kadapa"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila", "Tezu"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Dispur"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Ara", "Begusarai", "Katihar", "Chhapra"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajanandgaon", "Jagdalpur", "Ambikapur"],
  Goa: ["Panjim", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Calangute"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Navsari", "Morbi", "Bhuj"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamsala", "Solan", "Mandi", "Kullu", "Bilaspur", "Hamirpur", "Una"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Kalaburagi", "Davangere", "Ballari", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Alappuzha", "Palakkad", "Kannur", "Kottayam", "Malappuram", "Idukki", "Pathanamthitta"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Satna", "Rewa", "Ratlam", "Dewas"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Amravati", "Nanded", "Sangli", "Ahilyanagar"],
  Manipur: ["Imphal", "Thoubal", "Churachandpur", "Bishnupur", "Kakching"],
  Meghalaya: ["Shillong", "Tura", "Jowai", "Nongstoin", "Bagmara"],
  Mizoram: ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur", "Moga"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bhilwara", "Sikar", "Mount Abu"],
  Sikkim: ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo"],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
    "Tirunelveli",
    "Erode",
    "Vellore",
    "Thoothukudi",
    "Dindigul",
    "Thanjavur",
    "Hosur",
    "Nagercoil",
    "Kanchipuram",
    "Cuddalore",
    "Karur",
    "Kanniyakumari",
    "Vellakoil",
    "Tiruvannamalai",
    "Nagapattinam",
    "Ooty",
    "Kumbakonam",
    "Namakkal",
    "Villupuram",
  ],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahbubnagar", "Nalgonda", "Adilabad"],
  Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar", "Belonia"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj", "Noida", "Bareilly", "Aligarh", "Moradabad", "Gorakhpur", "Mathura", "Jhansi"],
  Uttarakhand: ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Roorkee", "Nainital", "Rudrapur", "Almora"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Kharagpur", "Darjeeling", "Kalyani"],
  "Andaman and Nicobar Islands": ["Port Blair", "Car Nicobar", "Havelock Island"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman", "Diu"],
  Delhi: ["New Delhi", "Delhi", "Dwarka", "Rohini", "Saket"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramula", "Udhampur", "Kathua", "Sopur"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti", "Agatti"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

async function geocode(city, state) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&countryCode=IN`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  const body = await response.json();
  const results = body.results ?? [];
  if (results.length === 0) return null;

  const normalise = (value) => (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const wanted = normalise(state);

  const match =
    results.find((entry) => normalise(entry.admin1) === wanted) ??
    results.find((entry) => normalise(entry.admin1).includes(wanted) || wanted.includes(normalise(entry.admin1))) ??
    results.find((entry) => normalise(entry.name) === normalise(city));

  if (!match) return null;
  return { name: match.name, state: match.admin1 ?? state, lat: Number(match.latitude.toFixed(4)), lon: Number(match.longitude.toFixed(4)) };
}

const states = [];
let resolved = 0;
let missed = [];

for (const [state, cities] of Object.entries(STATES)) {
  const list = [];
  for (const city of cities) {
    const hit = await geocode(city, state);
    if (hit) {
      list.push({ city, lat: hit.lat, lon: hit.lon });
      resolved += 1;
    } else {
      missed.push(`${city} (${state})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  if (list.length > 0) states.push({ state, cities: list });
}

const lines = [
  "/**",
  " * Indian states and their cities, with coordinates.",
  " *",
  " * Generated by scripts/build-india-cities.mjs (city names curated there, coordinates",
  " * resolved once through the keyless Open-Meteo geocoding API and baked in). Re-run",
  " * that script to refresh or extend the list.",
  " */",
  "",
  "export type IndiaCity = { city: string; lat: number; lon: number };",
  "export type IndiaState = { state: string; cities: readonly IndiaCity[] };",
  "",
  "export const INDIA_STATES: readonly IndiaState[] = [",
];

for (const { state, cities } of states) {
  lines.push(`  {`);
  lines.push(`    state: ${JSON.stringify(state)},`);
  lines.push(`    cities: [`);
  for (const city of cities) {
    lines.push(`      { city: ${JSON.stringify(city.city)}, lat: ${city.lat}, lon: ${city.lon} },`);
  }
  lines.push(`    ],`);
  lines.push(`  },`);
}

lines.push("];");
lines.push("");
lines.push("/** Coordinates for one state/city pair, or null when it is not in the list. */");
lines.push("export function findCity(state: string, city: string): IndiaCity | null {");
lines.push("  const group = INDIA_STATES.find((entry) => entry.state === state);");
lines.push("  return group?.cities.find((entry) => entry.city === city) ?? null;");
lines.push("}");
lines.push("");
lines.push("export type NearbyCity = IndiaCity & { state: string };");
lines.push("");
lines.push("/**");
lines.push(" * The listed city closest to a coordinate. Used to turn the browser's position");
lines.push(" * into a dropdown selection, so an approximate fix still lands on a real city.");
lines.push(" */");
lines.push("export function nearestCity(lat: number, lon: number): NearbyCity | null {");
lines.push("  let best: NearbyCity | null = null;");
lines.push("  let bestScore = Number.POSITIVE_INFINITY;");
lines.push("");
lines.push("  for (const group of INDIA_STATES) {");
lines.push("    for (const entry of group.cities) {");
lines.push("      // Squared planar distance is enough to pick the nearest city.");
lines.push("      const dLat = entry.lat - lat;");
lines.push("      const dLon = (entry.lon - lon) * Math.cos((lat * Math.PI) / 180);");
lines.push("      const score = dLat * dLat + dLon * dLon;");
lines.push("      if (score < bestScore) {");
lines.push("        bestScore = score;");
lines.push("        best = { ...entry, state: group.state };");
lines.push("      }");
lines.push("    }");
lines.push("  }");
lines.push("");
lines.push("  return best;");
lines.push("}");
lines.push("");

await writeFile("src/lib/india-cities.ts", `${lines.join("\n")}`, "utf8");

console.log(`states=${states.length} cities=${resolved} missed=${missed.length}`);
if (missed.length > 0) console.log(`missed: ${missed.slice(0, 20).join(", ")}`);
