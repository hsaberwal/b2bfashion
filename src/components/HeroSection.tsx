"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

type FeaturedProduct = {
  id: string;
  name: string;
  category: string;
  colour: string;
  images: string[];
};

export function HeroSection() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/products/hero")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const heroProduct = products[0];
  const leftProduct = products[1];
  const rightProduct = products[2];

  const heroImage = heroProduct?.images?.[0] ? imageDisplayUrl(heroProduct.images[0]) : null;
  const featureLeft = leftProduct?.images?.[0] ? imageDisplayUrl(leftProduct.images[0]) : null;
  const featureRight = rightProduct?.images?.[0] ? imageDisplayUrl(rightProduct.images[0]) : null;

  return (
    <>
      {/* Hero — full-width feature image */}
      <section
        className="relative w-full bg-je-black"
        style={{ aspectRatio: "1920/800" }}
      >
        {heroImage && (
          <img
            src={heroImage}
            alt={heroProduct?.name ?? "Claudia Collection"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="section-label text-white/80 mb-4">New Season</p>
          <h1 className="heading-serif text-white mb-4">
            The Collection
          </h1>
          {heroProduct && (
            <p className="text-white/70 text-sm mb-6">{heroProduct.name}</p>
          )}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={heroProduct ? `/products/${heroProduct.id}` : "/products"} className="btn-white">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Two-Column Feature — only show if we have products with images */}
      {(featureLeft || featureRight) && (
        <section className="grid grid-cols-1 md:grid-cols-2">
          <Link
            href={leftProduct ? `/products/${leftProduct.id}` : "/products"}
            className="relative aspect-[3/4] md:aspect-auto block group bg-je-offwhite"
          >
            {featureLeft && (
              <img
                src={featureLeft}
                alt={leftProduct?.name ?? "Featured collection"}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
              />
            )}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center px-4">
              <h3 className="font-serif text-2xl md:text-3xl text-white mb-2">
                {leftProduct?.name ?? "New Arrivals"}
              </h3>
              {leftProduct && (
                <p className="text-white/70 text-xs uppercase tracking-widest mb-4">
                  {leftProduct.category} &middot; {leftProduct.colour}
                </p>
              )}
              <span className="btn-white">View Collection</span>
            </div>
          </Link>

          <Link
            href={rightProduct ? `/products/${rightProduct.id}` : "/products"}
            className="relative aspect-[3/4] md:aspect-auto block group bg-je-offwhite"
          >
            {featureRight && (
              <img
                src={featureRight}
                alt={rightProduct?.name ?? "Seasonal styles"}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
              />
            )}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center px-4">
              <h3 className="font-serif text-2xl md:text-3xl text-white mb-2">
                {rightProduct?.name ?? "Best Sellers"}
              </h3>
              {rightProduct && (
                <p className="text-white/70 text-xs uppercase tracking-widest mb-4">
                  {rightProduct.category} &middot; {rightProduct.colour}
                </p>
              )}
              <span className="btn-white">Shop Now</span>
            </div>
          </Link>
        </section>
      )}
    </>
  );
}
