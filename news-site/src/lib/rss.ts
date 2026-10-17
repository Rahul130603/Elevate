/**
 * Small RSS helpers: entity decoding and a defensive XML -> item parser.
 * Kept dependency-free so the feed layer is easy to reason about.
 */

export type RawFeedItem = {
  title: string;
  link: string;
  guid?: string;
  pubDate?: string;
  source?: string;
  sourceUrl?: string;
  description?: string;
  image?: string | null;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  middot: "·",
  bull: "•",
  deg: "°",
  rupee: "₹",
};

export function decodeEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

export function stripTags(input: string): string {
  return decodeEntities(input.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Reads either `<title>text</title>` or `<title><![CDATA[text]]></title>`. */
function tagText(item: string, tag: string): string | undefined {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return undefined;
  const value = stripTags(match[1]);
  return value || undefined;
}

function selfClosingTag(item: string, tag: string): { value?: string; url?: string } | null {
  const match = item.match(new RegExp(`<${tag}([^>]*)\\/?>`, "i"));
  if (!match) return null;
  const attrs = match[1] || "";
  const url = attrs.match(/url=["']([^"']+)["']/i)?.[1];
  const inner = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1];
  return { value: inner ? stripTags(inner) : undefined, url };
}

/**
 * Parses an RSS document into a flat list of items.
 * Written to survive the shapes Google News actually returns, not every RSS 2.0
 * corner case — weird feeds degrade to fewer items instead of throwing.
 */
export function parseFeed(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];

  for (const block of blocks) {
    const title = tagText(block, "title");
    const linkTag = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)?.[1];
    const linkHref = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
    const link = linkTag ? decodeEntities(linkTag).trim() : (linkHref ?? "").trim();
    if (!title || !link) continue;

    const sourceTag = selfClosingTag(block, "source");
    const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["']/i)?.[1];
    const media = block.match(/<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i)?.[1];
    const description = tagText(block, "description") ?? tagText(block, "summary");

    items.push({
      title,
      link,
      guid: tagText(block, "guid") ?? tagText(block, "id"),
      pubDate: tagText(block, "pubDate") ?? tagText(block, "published") ?? tagText(block, "updated"),
      source: sourceTag?.value,
      sourceUrl: sourceTag?.url,
      description,
      image: enclosure ?? media ?? null,
    });
  }

  return items;
}

/** Stable, tiny hash used for ids and deterministic artwork. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
