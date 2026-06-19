/**
 * Shared types + sanitisation for admin-uploaded hero banners.
 *
 * The config is stored as a single SiteContent document under HERO_CONTENT_KEY:
 *   { mode: "products" | "banners" | "mixed", banners: HeroBanner[] }
 *
 * `mode` controls how the homepage hero is built:
 *   - "products" — auto-cycle stock product photos (the original behaviour)
 *   - "banners"  — show only the uploaded banners
 *   - "mixed"    — banners first, then product photos, in one rotation
 */

export const HERO_CONTENT_KEY = "heroBanners";

export type HeroMode = "products" | "banners" | "mixed";

export type HeroBanner = {
  /** Image blob key / URL (served via imageDisplayUrl). */
  image: string;
  /** Optional click-through href, e.g. "/products". */
  link?: string;
  /** Optional overlay headline. */
  headline?: string;
  /** Optional overlay subtext. */
  subtext?: string;
};

export type HeroConfig = {
  mode: HeroMode;
  banners: HeroBanner[];
};

export const DEFAULT_HERO_CONFIG: HeroConfig = { mode: "products", banners: [] };

const MODES: HeroMode[] = ["products", "banners", "mixed"];
const MAX_BANNERS = 12;

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

/** Coerce arbitrary stored/posted JSON into a safe HeroConfig. */
export function normalizeHeroConfig(raw: unknown): HeroConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HERO_CONFIG };
  const obj = raw as { mode?: unknown; banners?: unknown };

  const mode: HeroMode = MODES.includes(obj.mode as HeroMode) ? (obj.mode as HeroMode) : "products";

  const banners: HeroBanner[] = Array.isArray(obj.banners)
    ? obj.banners
        .map((b): HeroBanner | null => {
          if (!b || typeof b !== "object") return null;
          const image = str((b as { image?: unknown }).image, 500);
          if (!image) return null;
          return {
            image,
            link: str((b as { link?: unknown }).link, 500),
            headline: str((b as { headline?: unknown }).headline, 120),
            subtext: str((b as { subtext?: unknown }).subtext, 200),
          };
        })
        .filter((b): b is HeroBanner => b !== null)
        .slice(0, MAX_BANNERS)
    : [];

  return { mode, banners };
}
