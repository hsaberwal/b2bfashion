"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";
import { addToGuestCart } from "@/lib/guestCart";

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
  sizeRatio?: number[];
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
  // Size selection removed — packs contain a fixed ratio of sizes
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addedMessage, setAddedMessage] = useState("");
  const [user, setUser] = useState<{ pricingApproved?: boolean } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [zoomLens, setZoomLens] = useState<{
    x: number;
    y: number;
    percentX: number;
    percentY: number;
    rectW: number;
    rectH: number;
  } | null>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [careOpen, setCareOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setIsLoggedIn(!!d.user);
      });
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setProduct(null);
        else setProduct(d);
        if (d.packSize) setQuantity(d.packSize);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function addToCart() {
    if (!product || quantity < product.packSize || quantity % product.packSize !== 0) return;
    setAdding(true);
    setAddedMessage("");
    try {
      if (isLoggedIn) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ productId: product.id, quantity }],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error ?? "Failed to add to order");
          return;
        }
      } else {
        addToGuestCart({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity,
          packSize: product.packSize,
          pricePerItem: product.pricePerItem,
          image: product.images?.[0],
        });
      }
      const packs = quantity / product.packSize;
      setAddedMessage(`Added ${packs} pack${packs > 1 ? "s" : ""} of ${product.name} (${quantity} items) to your order`);
      setTimeout(() => setAddedMessage(""), 4000);
    } finally {
      setAdding(false);
    }
  }

  const handleImageMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = mainImageRef.current;
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
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/products" className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors">
            &larr; Back to garments
          </Link>
          <p className="text-je-muted mt-8">{loading ? "Loading..." : "Product not found."}</p>
        </div>
      </main>
    );
  }

  const minQty = product.packSize;
  const step = product.packSize;
  const validQty = quantity >= minQty && quantity % step === 0;
  const hasSizes = product.sizes && product.sizes.length > 0;
  const sizeRatio = product.sizeRatio ?? [];
  const images = product.images?.length ? product.images : [];
  const displayColours = product.colours?.length ? product.colours : [product.colour];

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link href="/products" className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors">
            &larr; Back to garments
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left: Image Gallery — BR style with thumbnails on left, main image right */}
          <div className="flex gap-3">
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="hidden md:flex flex-col gap-2 w-16 shrink-0">
                {images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setActiveImage(i)}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-[3/4] w-full border overflow-hidden transition-all ${
                      i === activeImage
                        ? "border-je-black"
                        : "border-je-border hover:border-je-charcoal"
                    }`}
                  >
                    <img
                      src={imageDisplayUrl(url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="flex-1">
              <div
                ref={mainImageRef}
                className="relative aspect-[3/4] bg-je-offwhite overflow-hidden cursor-zoom-in"
                onMouseMove={images[activeImage] ? handleImageMouseMove : undefined}
                onMouseLeave={images[activeImage] ? handleImageMouseLeave : undefined}
              >
                {images[activeImage] ? (
                  <>
                    <img
                      src={imageDisplayUrl(images[activeImage])}
                      alt={product.name}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                    />
                    {zoomLens && (
                      <div
                        className="pointer-events-none fixed rounded-full shadow-xl z-20 hidden sm:block border-2 border-je-border overflow-hidden"
                        style={{
                          width: LENS_SIZE,
                          height: LENS_SIZE,
                          left: zoomLens.x - LENS_SIZE / 2,
                          top: zoomLens.y - LENS_SIZE / 2,
                          backgroundImage: `url(${imageDisplayUrl(images[activeImage])})`,
                          backgroundSize: `${zoomLens.rectW * ZOOM}px ${zoomLens.rectH * ZOOM}px`,
                          backgroundPosition: `${-zoomLens.percentX * zoomLens.rectW * ZOOM + LENS_SIZE / 2}px ${-zoomLens.percentY * zoomLens.rectH * ZOOM + LENS_SIZE / 2}px`,
                          backgroundRepeat: "no-repeat",
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-je-muted">
                    No image
                  </div>
                )}
              </div>

              {/* Mobile thumbnail row */}
              {images.length > 1 && (
                <div className="flex md:hidden gap-2 mt-3 overflow-x-auto pb-2">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`w-16 h-20 shrink-0 border overflow-hidden transition-all ${
                        i === activeImage
                          ? "border-je-black"
                          : "border-je-border"
                      }`}
                    >
                      <img
                        src={imageDisplayUrl(url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {images[activeImage] && (
                <p className="text-xs text-je-muted mt-2 hidden sm:block">Hover over image to zoom</p>
              )}
            </div>
          </div>

          {/* All product images stacked below on desktop — BR style */}
          {images.length > 1 && (
            <div className="hidden lg:block">
              {/* Product Info — sticky on scroll */}
              <div className="lg:sticky lg:top-8">
                {/* Category & SKU */}
                <div className="mb-4">
                  <p className="text-[11px] uppercase tracking-widest text-je-muted">
                    {product.category}
                  </p>
                  {product.productCode && (
                    <p className="text-[11px] text-je-muted mt-1">Product code: {product.productCode}</p>
                  )}
                </div>

                {/* Product Name */}
                <h1 className="font-serif text-3xl md:text-4xl text-je-black leading-tight mb-2">
                  {product.name}
                </h1>

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-6">
                  {user?.pricingApproved && product.pricePerItem != null && (
                    <>
                      {product.compareAtPrice != null && product.compareAtPrice > product.pricePerItem && (
                        <span className="text-je-muted line-through text-lg">
                          £{product.compareAtPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xl font-medium text-je-black screenshot-protected relative">
                        £{product.pricePerItem.toFixed(2)}
                      </span>
                      <span className="text-sm text-je-muted">per item</span>
                    </>
                  )}
                </div>

                {/* Colour */}
                <div className="mb-6">
                  <p className="text-[11px] uppercase tracking-widest text-je-muted mb-2">
                    Colour: <span className="text-je-black">{displayColours.join(", ")}</span>
                  </p>
                </div>

                {/* Pack contents */}
                {hasSizes && (
                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-widest text-je-muted mb-3">
                      Each Pack Contains
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes!.map((s, i) => (
                        <span
                          key={s}
                          className="px-3 py-1.5 border border-je-border text-sm text-je-charcoal bg-je-offwhite"
                        >
                          {sizeRatio[i] ?? 1}&times;{s}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-je-muted mt-2">
                      {product.packSize} items per pack
                    </p>
                  </div>
                )}

                {/* Quantity & Add to order */}
                <div className="mb-6">
                  <p className="text-[11px] uppercase tracking-widest text-je-muted mb-3">
                    Quantity (packs of {step})
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(minQty, quantity - step))}
                      className="w-10 h-10 border border-je-border flex items-center justify-center text-je-black hover:border-je-black transition-colors"
                    >
                      &minus;
                    </button>
                    <input
                      type="number"
                      min={minQty}
                      step={step}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || minQty)}
                      className="w-20 h-10 text-center border border-je-border text-je-black"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + step)}
                      className="w-10 h-10 border border-je-border flex items-center justify-center text-je-black hover:border-je-black transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={addToCart}
                    disabled={!validQty || adding}
                    className="w-full py-4 bg-je-black text-white text-[11px] uppercase tracking-widest font-semibold
                               hover:bg-je-charcoal disabled:opacity-40 transition-all duration-300"
                  >
                    {adding ? "Adding..." : "Add to Order"}
                  </button>

                  {!validQty && quantity > 0 && (
                    <p className="mt-2 text-xs text-je-sale">
                      Quantity must be a multiple of {product.packSize}
                    </p>
                  )}
                  {addedMessage && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800 flex items-center justify-between">
                      <span>{addedMessage}</span>
                      <Link href="/cart" className="text-green-900 font-semibold underline ml-3">
                        View Cart
                      </Link>
                    </div>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-je-muted leading-relaxed mb-6">
                    {product.description}
                  </p>
                )}

                {/* Expandable Details */}
                {(product.longDescription || product.materials) && (
                  <div className="border-t border-je-border">
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(!detailsOpen)}
                      className="w-full flex items-center justify-between py-4 text-left"
                    >
                      <span className="text-[11px] uppercase tracking-widest font-semibold text-je-black">
                        Product Details
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-je-muted transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {detailsOpen && (
                      <div className="pb-4 space-y-3 text-sm text-je-muted leading-relaxed">
                        {product.longDescription && (
                          <p className="whitespace-pre-wrap">{product.longDescription}</p>
                        )}
                        {product.materials && (
                          <p><span className="font-medium text-je-charcoal">Materials:</span> {product.materials}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Expandable Care */}
                {product.careGuide && (
                  <div className="border-t border-je-border">
                    <button
                      type="button"
                      onClick={() => setCareOpen(!careOpen)}
                      className="w-full flex items-center justify-between py-4 text-left"
                    >
                      <span className="text-[11px] uppercase tracking-widest font-semibold text-je-black">
                        Care Instructions
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-je-muted transition-transform duration-200 ${careOpen ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {careOpen && (
                      <div className="pb-4 text-sm text-je-muted leading-relaxed">
                        <p>{product.careGuide}</p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-je-muted mt-4 pt-4 border-t border-je-border">
                  SKU: {product.sku}
                </p>
              </div>
            </div>
          )}

          {/* Single image fallback — show info inline */}
          {images.length <= 1 && (
            <div>
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-widest text-je-muted">
                  {product.category}
                </p>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl text-je-black leading-tight mb-2">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 mb-6">
                {user?.pricingApproved && product.pricePerItem != null && (
                  <>
                    {product.compareAtPrice != null && product.compareAtPrice > product.pricePerItem && (
                      <span className="text-je-muted line-through text-lg">
                        £{product.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xl font-medium text-je-black screenshot-protected relative">
                      £{product.pricePerItem.toFixed(2)}
                    </span>
                    <span className="text-sm text-je-muted">per item</span>
                  </>
                )}
              </div>
              <p className="text-[11px] uppercase tracking-widest text-je-muted mb-4">
                Colour: <span className="text-je-black">{displayColours.join(", ")}</span>
              </p>
              {hasSizes && (
                <div className="mb-6">
                  <p className="text-[11px] uppercase tracking-widest text-je-muted mb-3">Each Pack Contains</p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes!.map((s, i) => (
                      <span key={s} className="px-3 py-1.5 border border-je-border text-sm text-je-charcoal bg-je-offwhite">
                        {sizeRatio[i] ?? 1}&times;{s}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-je-muted mt-2">{product.packSize} items per pack</p>
                </div>
              )}
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-widest text-je-muted mb-3">
                  Quantity (packs of {step})
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(minQty, quantity - step))}
                    className="w-10 h-10 border border-je-border flex items-center justify-center text-je-black hover:border-je-black transition-colors"
                  >
                    &minus;
                  </button>
                  <input
                    type="number"
                    min={minQty}
                    step={step}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || minQty)}
                    className="w-20 h-10 text-center border border-je-border text-je-black"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + step)}
                    className="w-10 h-10 border border-je-border flex items-center justify-center text-je-black hover:border-je-black transition-colors"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={addToCart}
                  disabled={!validQty || adding}
                  className="w-full py-4 bg-je-black text-white text-[11px] uppercase tracking-widest font-semibold
                             hover:bg-je-charcoal disabled:opacity-40 transition-all duration-300"
                >
                  {adding ? "Adding..." : "Add to Order"}
                </button>
              </div>
              {product.description && (
                <p className="text-sm text-je-muted leading-relaxed mb-4">{product.description}</p>
              )}
              {product.materials && (
                <p className="text-sm text-je-muted"><span className="font-medium text-je-charcoal">Materials:</span> {product.materials}</p>
              )}
              {product.careGuide && (
                <p className="text-sm text-je-muted mt-2"><span className="font-medium text-je-charcoal">Care:</span> {product.careGuide}</p>
              )}
              <p className="text-xs text-je-muted mt-4 pt-4 border-t border-je-border">SKU: {product.sku}</p>
            </div>
          )}
        </div>

        {/* Full image gallery below — all product images stacked, BR style */}
        {images.length > 1 && (
          <section className="mt-16 border-t border-je-border pt-16">
            <p className="text-[11px] uppercase tracking-widest text-je-muted text-center mb-8">
              All Views
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
              {images.map((url, i) => (
                <div key={i} className="aspect-[3/4] relative bg-je-offwhite overflow-hidden group cursor-pointer"
                     onClick={() => { setActiveImage(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <img
                    src={imageDisplayUrl(url)}
                    alt={`${product.name} - View ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
