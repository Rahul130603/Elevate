import { categoryHue, type Category } from "@/lib/categories";
import { monogram } from "@/lib/format";
import { hashString } from "@/lib/rss";
import type { Locale } from "@/lib/i18n";

type ThumbSize = "hero" | "card" | "compact";

/**
 * Story artwork. When the publisher's own photo is available (`image`) it is
 * shown; otherwise — Google News gives no images, and some publishers block
 * bots — the card gets deterministic generated artwork: a colour field derived
 * from the section hue plus the publisher monogram. Same story, same artwork,
 * on the server and on the client, with zero extra requests.
 */
export function StoryThumb({
  seed,
  source,
  category,
  size = "card",
  label,
  locale,
  image,
  priority = false,
  className = "",
}: {
  seed: string;
  source: string;
  category: Category;
  size?: ThumbSize;
  label?: string;
  locale?: Locale;
  image?: string | null;
  priority?: boolean;
  className?: string;
}) {
  const hash = hashString(`${seed}:${category}`);
  const hue = (categoryHue(category) + (hash % 44)) % 360;
  const angle = 108 + (hash % 58);
  const hue2 = (hue + 24) % 360;
  const hue3 = (hue + 58) % 360;

  const fontSize = size === "hero" ? "8.5rem" : size === "compact" ? "3.25rem" : "4.75rem";

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-ink-800 ${className}`}
      style={{
        backgroundImage: `radial-gradient(120% 120% at 12% 8%, hsl(${hue} 78% 52%) 0%, transparent 55%), linear-gradient(${angle}deg, hsl(${hue} 66% 42%) 0%, hsl(${hue2} 70% 26%) 62%, hsl(${hue3} 58% 14%) 100%)`,
      }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          {/* diagonal texture */}
          <div
            className="absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(105deg, rgba(255,255,255,0.9) 0 1px, transparent 1px 13px)",
            }}
          />
          <span
            className="pointer-events-none absolute -bottom-3 right-1 select-none font-black tracking-tighter text-white/15"
            style={{ fontSize, lineHeight: 1 }}
          >
            {monogram(source)}
          </span>
        </>
      )}

      {/* soft vignette: keeps overlaid headline text readable on photos too */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

      {label ? (
        <span
          lang={locale}
          className="absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm"
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
