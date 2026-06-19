import { describe, it, expect } from "vitest";
import { normalizeHeroConfig, DEFAULT_HERO_CONFIG } from "./heroBanners";

describe("normalizeHeroConfig", () => {
  it("returns defaults for null/garbage input", () => {
    expect(normalizeHeroConfig(null)).toEqual(DEFAULT_HERO_CONFIG);
    expect(normalizeHeroConfig("nope")).toEqual(DEFAULT_HERO_CONFIG);
    expect(normalizeHeroConfig(42)).toEqual(DEFAULT_HERO_CONFIG);
  });

  it("falls back to 'products' for an invalid mode", () => {
    expect(normalizeHeroConfig({ mode: "wat", banners: [] }).mode).toBe("products");
  });

  it("keeps valid modes", () => {
    expect(normalizeHeroConfig({ mode: "banners", banners: [] }).mode).toBe("banners");
    expect(normalizeHeroConfig({ mode: "mixed", banners: [] }).mode).toBe("mixed");
  });

  it("keeps valid banners and drops ones without an image", () => {
    const out = normalizeHeroConfig({
      mode: "banners",
      banners: [
        { image: "key1", link: "/products", headline: "Sale", subtext: "20% off" },
        { link: "/no-image" }, // dropped — no image
        { image: "  " }, // dropped — blank image
        "garbage", // dropped — not an object
      ],
    });
    expect(out.banners).toHaveLength(1);
    expect(out.banners[0]).toEqual({ image: "key1", link: "/products", headline: "Sale", subtext: "20% off" });
  });

  it("trims and omits blank optional fields", () => {
    const out = normalizeHeroConfig({ mode: "banners", banners: [{ image: " key ", link: "  ", headline: "" }] });
    expect(out.banners[0].image).toBe("key");
    expect(out.banners[0].link).toBeUndefined();
    expect(out.banners[0].headline).toBeUndefined();
  });

  it("caps the number of banners", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ image: `k${i}` }));
    expect(normalizeHeroConfig({ mode: "banners", banners: many }).banners.length).toBeLessThanOrEqual(12);
  });
});
