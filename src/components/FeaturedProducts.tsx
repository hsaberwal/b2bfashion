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
  packSize: number;
  stockCategory: string;
};

export function FeaturedProducts() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/featured")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-je-offwhite animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/products/${product.id}`}
          className="group relative overflow-hidden"
        >
          <div className="aspect-[3/4] relative bg-je-offwhite overflow-hidden">
            {product.images[0] ? (
              <>
                <img
                  src={imageDisplayUrl(product.images[0])}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* Show second image on hover if available */}
                {product.images[1] && (
                  <img
                    src={imageDisplayUrl(product.images[1])}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-je-muted text-sm">
                No image
              </div>
            )}
          </div>
          <div className="py-3 px-1">
            <p className="text-sm font-medium text-je-black truncate">{product.name}</p>
            <p className="text-xs text-je-muted mt-0.5">{product.category} &middot; {product.colour}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
