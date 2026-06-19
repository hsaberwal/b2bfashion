"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

import type { HeroConfig } from "@/lib/heroBanners";

type FeaturedProduct = {
  id: string;
  name: string;
  category: string;
  colour: string;
  images: string[];
  heroFocalPoint?: string;
  heroImageIndex?: number;
  heroExcludedIndexes?: number[];
};

/** A single hero slide — either a product photo or an admin-uploaded banner. */
type Slide = {
  kind: "product" | "banner";
  image: string;
  focalPoint: string;
  href: string;
  /** Caption line 1: product name or banner headline. */
  title?: string;
  /** Caption line 2: product "category · colour" or banner subtext. */
  subtitle?: string;
  product?: FeaturedProduct;
};

/**
 * Hero section that cycles through ALL Front Page products and ALL their images.
 *
 * - Builds a flat list of all images from all hero products
 * - Crossfades between them every 5 seconds
 * - Each image links to its product's detail page
 * - Shows the product name and category for the current image
 * - Two-column feature below shows the next two different products
 */
export function HeroSection() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Flat list of all hero slides (banners and/or product images)
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetch("/api/products/hero")
      .then((r) => r.json())
      .then((d) => {
        const prods = (d.products ?? []) as FeaturedProduct[];
        setProducts(prods);

        const hero = (d.hero ?? { mode: "products", banners: [] }) as HeroConfig;

        // Banner slides come from admin uploads.
        const bannerSlides: Slide[] = hero.banners.map((b) => ({
          kind: "banner",
          image: b.image,
          focalPoint: "50% 50%",
          href: b.link || "/products",
          title: b.headline,
          subtitle: b.subtext,
        }));

        // Product slides — primary hero image first, then the rest (excluding hidden ones).
        const productSlides: Slide[] = [];
        for (const p of prods) {
          if (p.images.length === 0) continue;
          const excluded = new Set(p.heroExcludedIndexes ?? []);
          const idx = p.heroImageIndex ?? 0;
          const caption = { title: p.name, subtitle: `${p.category} · ${p.colour}` };
          if (idx < p.images.length && !excluded.has(idx)) {
            productSlides.push({ kind: "product", image: p.images[idx], focalPoint: p.heroFocalPoint ?? "50% 50%", href: `/products/${p.id}`, product: p, ...caption });
          }
          for (let i = 0; i < p.images.length; i++) {
            if (i !== idx && !excluded.has(i)) {
              productSlides.push({ kind: "product", image: p.images[i], focalPoint: "50% 50%", href: `/products/${p.id}`, product: p, ...caption });
            }
          }
        }

        // Compose the rotation based on the admin-selected mode. "banners" falls
        // back to product slides if no banners are uploaded, so the hero is never blank.
        let composed: Slide[];
        if (hero.mode === "banners") composed = bannerSlides.length > 0 ? bannerSlides : productSlides;
        else if (hero.mode === "mixed") composed = [...bannerSlides, ...productSlides];
        else composed = productSlides;

        setSlides(composed);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Auto-cycle through slides
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (slides.length > 0 ? (prev + 1) % slides.length : 0));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [slides.length, nextSlide]);

  // Get the current slide info
  const current = slides[currentSlide];
  const currentProduct = current?.product;

  // For the two-column feature: pick 2 products that aren't the current hero product
  const otherProducts = products.filter((p) => p.id !== currentProduct?.id);
  const featureLeft = otherProducts[0];
  const featureRight = otherProducts[1];

  return (
    <>
      {/* Hero — full-width with cycling images */}
      <section
        className="relative w-full bg-je-black overflow-hidden"
        style={{ aspectRatio: "1920/800" }}
      >
        {/* All slide images rendered, only current one visible */}
        {slides.map((slide, i) => (
          <img
            key={`${slide.kind}-${i}`}
            src={imageDisplayUrl(slide.image, { width: 1600 })}
            alt={slide.title ?? "Hero banner"}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              i === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{ objectPosition: slide.focalPoint }}
          />
        ))}

        {/* Fallback if no products */}
        {slides.length === 0 && loaded && (
          <div className="absolute inset-0 bg-je-black" />
        )}

        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="section-label text-white/80 mb-4">New Season</p>
          <h1 className="heading-serif text-white mb-4">
            {current?.kind === "banner" && current.title ? current.title : "The Collection"}
          </h1>
          {current?.kind === "banner"
            ? current.subtitle && <p className="text-white/70 text-sm mb-6">{current.subtitle}</p>
            : (
              <>
                {current?.title && <p className="text-white/70 text-sm mb-2">{current.title}</p>}
                {current?.subtitle && (
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-6">{current.subtitle}</p>
                )}
              </>
            )}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={current?.href ?? "/products"} className="btn-white">
              Shop Now
            </Link>
          </div>

          {/* Slide indicators */}
          {slides.length > 1 && (
            <div className="flex gap-2 mt-8">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentSlide ? "bg-white w-6" : "bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Two-Column Feature — shows other products */}
      {(featureLeft || featureRight) && (
        <section className="grid grid-cols-1 md:grid-cols-2">
          {featureLeft && (
            <Link
              href={`/products/${featureLeft.id}`}
              className="relative aspect-[3/4] md:aspect-auto block group bg-je-offwhite"
            >
              {featureLeft.images[0] && (
                <img
                  src={imageDisplayUrl(featureLeft.images[0], { width: 1000 })}
                  alt={featureLeft.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center px-4">
                <h3 className="font-serif text-2xl md:text-3xl text-white mb-2">{featureLeft.name}</h3>
                <p className="text-white/70 text-xs uppercase tracking-widest mb-4">
                  {featureLeft.category} &middot; {featureLeft.colour}
                </p>
                <span className="btn-white">View Collection</span>
              </div>
            </Link>
          )}
          {featureRight && (
            <Link
              href={`/products/${featureRight.id}`}
              className="relative aspect-[3/4] md:aspect-auto block group bg-je-offwhite"
            >
              {featureRight.images[0] && (
                <img
                  src={imageDisplayUrl(featureRight.images[0], { width: 1000 })}
                  alt={featureRight.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center px-4">
                <h3 className="font-serif text-2xl md:text-3xl text-white mb-2">{featureRight.name}</h3>
                <p className="text-white/70 text-xs uppercase tracking-widest mb-4">
                  {featureRight.category} &middot; {featureRight.colour}
                </p>
                <span className="btn-white">Shop Now</span>
              </div>
            </Link>
          )}
        </section>
      )}
    </>
  );
}
