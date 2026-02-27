"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

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

  if (loading || !product) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <Link href="/products" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to products
        </Link>
        <p className="text-gray-500">{loading ? "Loading…" : "Product not found."}</p>
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
    <main className="min-h-screen p-4 md:p-8">
      <Link href="/products" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
        ← Back to products
      </Link>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
            {images[imageIndex] ? (
              <img
                src={imageDisplayUrl(images[imageIndex])}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  className={`w-16 h-16 rounded border-2 overflow-hidden shrink-0 ${
                    i === imageIndex ? "border-gray-900 dark:border-white" : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <img src={imageDisplayUrl(url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          {product.productCode && (
            <p className="font-mono text-sm text-gray-500">Product code: {product.productCode}</p>
          )}
          <p className="font-mono text-sm text-gray-500">{product.sku}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {product.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {product.category} · {displayColours.join(", ")}
          </p>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            {user?.pricingApproved && product.pricePerItem != null && (
              <>
                {product.compareAtPrice != null && product.compareAtPrice > product.pricePerItem && (
                  <span className="text-gray-500 line-through">£{product.compareAtPrice.toFixed(2)}</span>
                )}
                <span className="font-medium text-gray-900 dark:text-white screenshot-protected relative">
                  £{product.pricePerItem.toFixed(2)} per item
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
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size *</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes!.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                      selectedSize === s
                        ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500">
            Pack size: {product.packSize} (bulk ordering only — quantity must be a multiple of {product.packSize})
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity (multiples of {step}):</span>
              <input
                type="number"
                min={minQty}
                step={step}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || minQty)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </label>
            <button
              onClick={addToCart}
              disabled={!validQty || !validSize || adding}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add to order"}
            </button>
          </div>
          {hasSizes && !selectedSize && (
            <p className="mt-2 text-sm text-amber-600">Please select a size.</p>
          )}
          {!validQty && quantity > 0 && (
            <p className="mt-2 text-sm text-amber-600">
              Quantity must be a multiple of {product.packSize}.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
