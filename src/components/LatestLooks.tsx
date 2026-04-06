"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

type LatestProduct = {
  id: string;
  name: string;
  category: string;
  colour: string;
  images: string[];
};

/** Single card that rotates through a product's images */
function RotatingCard({ product }: { product: LatestProduct }) {
  const [index, setIndex] = useState(0);
  const images = product.images;

  useEffect(() => {
    if (images.length <= 1) return;
    // Each card starts at a random offset so they don't all rotate in sync
    const offset = Math.floor(Math.random() * 2000);
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % images.length);
      }, 3000 + Math.random() * 1000); // 3-4s per image, slightly varied
      return () => clearInterval(interval);
    }, offset);
    return () => clearTimeout(timer);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-je-offwhite flex items-center justify-center text-je-muted text-sm">
        No image
      </div>
    );
  }

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="aspect-[3/4] relative bg-je-offwhite overflow-hidden">
        {images.map((url, i) => (
          <img
            key={i}
            src={imageDisplayUrl(url)}
            alt={`${product.name} - ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* Subtle hover zoom on the active image */}
        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="py-3 px-1">
        <p className="text-sm font-medium text-je-black truncate">{product.name}</p>
        <p className="text-xs text-je-muted mt-0.5">
          {product.category} &middot; {product.colour}
          {images.length > 1 && (
            <span className="ml-2 text-je-muted/50">{images.length} photos</span>
          )}
        </p>
      </div>
    </Link>
  );
}

export function LatestLooks() {
  const [products, setProducts] = useState<LatestProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/latest-looks")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-je-offwhite animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
      {products.map((product) => (
        <RotatingCard key={product.id} product={product} />
      ))}
    </div>
  );
}
