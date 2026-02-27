"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

const ZOOM = 2.2;
const LENS_SIZE = 180;

type Product = {
  id: string;
  sku: string;
  productCode?: string;
  name: string;
  description?: string;
  longDescription?: string;
  materials?: string;
  careGuide?: string;
  category: string;
  stockCategory: string;
  colour: string;
  colours?: string[];
  sizes?: string[];
  images: string[];
  packSize: number;
  pricePerItem?: number;
  compareAtPrice?: number;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [user, setUser] = useState<{ pricingApproved?: boolean } | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomLens, setZoomLens] = useState<{
    x: number;
    y: number;
    percentX: number;
    percentY: number;
    rectW: number;
    rectH: number;
  } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setProduct(null);
        else setProduct(d);
        if (d.packSize) setQuantity(d.packSize);
        if (d.sizes?.length) setSelectedSize(d.sizes[0] ?? "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function addToCart() {
    const hasSizes = product.sizes && product.sizes.length > 0;
    if (!product || quantity < product.packSize || quantity % product.packSize !== 0) return;
    if (hasSizes && !selectedSize) {
      alert("Please select a size.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity, ...(hasSizes ? { size: selectedSize } : {}) }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to add to order");
        return;
      }
      router.push("/cart");
    } finally {
      setAdding(false);
    }
  }

  const handleImageMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = imageContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const percentX = Math.max(0, Math.min(1, x / rect.width));
      const percentY = Math.max(0, Math.min(1, y / rect.height));
      setZoomLens({
        x: e.clientX,
        y: e.clientY,
        percentX,
        percentY,
        rectW: rect.width,
        rectH: rect.height,
      });
    },
    []
  );
  const handleImageMouseLeave = useCallback(() => setZoomLens(null), []);

  if (loading || !product) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-je-cream">
        <Link href="/products" className="text-sm text-je-muted hover:text-je-black mb-4 inline-block">
          ← Back to products
        </Link>
        <p className="text-je-muted">{loading ? "Loading…" : "Product not found."}</p>
      </main>
    );
  }

  const minQty = product.packSize;
  const step = product.packSize;
  const validQty = quantity >= minQty && quantity % step === 0;
  const hasSizes = product.sizes && product.sizes.length > 0;
  const validSize = !hasSizes || selectedSize.length > 0;
  const images = product.images?.length ? product.images : [];
  const displayColours = product.colours?.length ? product.colours : [product.colour];

  return (
    <main className="min-h-screen p-4 md:p-8 bg-je-cream">
      <Link href="/products" className="text-sm text-je-muted hover:text-je-black mb-4 inline-block transition-colors">
        ← Back to products
      </Link>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <div
            ref={imageContainerRef}
            className="relative aspect-square bg-je-offwhite border border-je-border overflow-hidden mb-4 cursor-zoom-in"
            onMouseMove={images[imageIndex] ? handleImageMouseMove : undefined}
            onMouseLeave={images[imageIndex] ? handleImageMouseLeave : undefined}
          >
            {images[imageIndex] ? (
              <>
                <img
                  src={imageDisplayUrl(images[imageIndex])}
                  alt={product.name}
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
                {zoomLens && (
                  <div
                    className="pointer-events-none fixed border-2 border-je-white rounded-full shadow-xl bg-je-offwhite/95 z-20 hidden sm:block overflow-hidden"
                    style={{
                      width: LENS_SIZE,
                      height: LENS_SIZE,
                      left: zoomLens.x - LENS_SIZE / 2,
                      top: zoomLens.y - LENS_SIZE / 2,
                    }}
                  >
                    <img
                      src={imageDisplayUrl(images[imageIndex])}
                      alt=""
                      className="absolute w-full h-full object-cover"
                      style={{
                        width: zoomLens.rectW * ZOOM,
                        height: zoomLens.rectH * ZOOM,
                        left: -zoomLens.percentX * zoomLens.rectW * ZOOM + LENS_SIZE / 2,
                        top: -zoomLens.percentY * zoomLens.rectH * ZOOM + LENS_SIZE / 2,
                      }}
                      draggable={false}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>
          {images[imageIndex] && (
            <p className="text-xs text-je-muted mt-1 hidden sm:block">Hover over image to zoom</p>
          )}
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  className={`w-16 h-16 border overflow-hidden shrink-0 transition-colors ${
                    i === imageIndex ? "border-je-black ring-1 ring-je-black" : "border-je-border hover:border-je-charcoal"
                  }`}
                >
                  <img src={imageDisplayUrl(url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="bg-je-white border border-je-border p-6 md:p-8">
          {product.productCode && (
            <p className="text-sm text-je-muted">Product code: {product.productCode}</p>
          )}
          <p className="text-sm text-je-muted font-medium mt-1">SKU {product.sku}</p>
          <h1 className="text-2xl font-bold text-je-black mt-2 tracking-tight">
            {product.name}
          </h1>
          <p className="text-je-muted mt-2">
            {product.category} · {displayColours.join(", ")}
          </p>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            {user?.pricingApproved && product.pricePerItem != null && (
              <>
                {product.compareAtPrice != null && product.compareAtPrice > product.pricePerItem && (
                  <span className="text-je-muted line-through text-lg">£{product.compareAtPrice.toFixed(2)}</span>
                )}
                <span className="text-lg font-semibold text-je-black screenshot-protected relative">
                  £{product.pricePerItem.toFixed(2)} <span className="text-sm font-normal text-je-muted">per item</span>
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-400">{product.description}</p>
          )}
          {product.longDescription && (
            <div className="mt-4 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {product.longDescription}
            </div>
          )}
          {product.materials && (
            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Materials</p>
          )}
          {product.materials && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{product.materials}</p>
          )}
          {product.careGuide && (
            <>
              <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Care</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{product.careGuide}</p>
            </>
          )}

          {hasSizes && (
            <div className="mt-5">
              <p className="text-sm font-medium text-je-black mb-2">Size *</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes!.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`px-4 py-2 border text-sm font-medium transition-colors ${
                      selectedSize === s
                        ? "border-je-black bg-je-black text-je-white"
                        : "border-je-border bg-je-white text-je-charcoal hover:border-je-charcoal"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-je-muted">
            Pack size: {product.packSize} (bulk ordering only — quantity must be a multiple of {product.packSize})
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-je-black">Quantity (multiples of {step}):</span>
              <input
                type="number"
                min={minQty}
                step={step}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || minQty)}
                className="w-24 px-3 py-2 border border-je-border bg-je-white text-je-black"
              />
            </label>
            <button
              onClick={addToCart}
              disabled={!validQty || !validSize || adding}
              className="px-6 py-2.5 bg-je-black text-je-white font-medium hover:bg-je-charcoal disabled:opacity-50 transition-colors"
            >
              {adding ? "Adding…" : "Add to order"}
            </button>
          </div>
          {hasSizes && !selectedSize && (
            <p className="mt-2 text-sm text-je-sale">Please select a size.</p>
          )}
          {!validQty && quantity > 0 && (
            <p className="mt-2 text-sm text-je-sale">
              Quantity must be a multiple of {product.packSize}.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
