import { localeMeta, type Locale } from "./i18n";

/** Absolute time, e.g. "14:05, 12 Mar" (locale aware). */
export function formatDateTime(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(localeMeta[locale].intl, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(localeMeta[locale].intl, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "5 min ago" style relative label, falling back to a date after a week. */
export function formatRelative(iso: string | null, locale: Locale, now: Date = new Date()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat(localeMeta[locale].intl, {
    numeric: "auto",
    style: "narrow",
  });

  if (Math.abs(minutes) < 60) return formatter.format(-minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(-hours, "hour");

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return formatter.format(-days, "day");

  return formatDateTime(iso, locale);
}

export function todayLabel(locale: Locale, now: Date = new Date()): string {
  return new Intl.DateTimeFormat(localeMeta[locale].intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}

/** RFC-822 timestamp for our own RSS output. */
export function toRfc822(iso: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).toUTCString();
}

/** Escapes text for XML output. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Two-letter monogram used on generated artwork. */
export function monogram(source: string): string {
  const words = source
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .split(/[\s.]+/)
    .filter(Boolean);
  if (words.length === 0) return "NN";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function uniqueSources<T extends { source: string }>(items: T[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const name = item.source.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}
