"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  stockCategory: string;
  colour: string;
  attributes: Record<string, string>;
  images: string[];
  packSize: number;
  pricePerItem?: number;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [user, setUser] = useState<{ pricingApproved?: boolean } | null>(null);

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
    if (!product || quantity < product.packSize || quantity % product.packSize !== 0) return;
    setAdding(true);
    try {
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

  return (
    <main className="min-h-screen p-4 md:p-8">
      <Link href="/products" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
        ← Back to products
      </Link>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>
        <div>
          <p className="font-mono text-sm text-gray-500">{product.sku}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {product.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {product.category} · {product.colour}
          </p>
          {product.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-400">{product.description}</p>
          )}
          <p className="mt-4 text-sm text-gray-500">
            Pack size: {product.packSize} (bulk ordering only — quantity must be a multiple of {product.packSize})
          </p>
          {user?.pricingApproved && product.pricePerItem != null && (
            <p className="mt-2 font-medium screenshot-protected relative">
              £{product.pricePerItem.toFixed(2)} per item
            </p>
          )}
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
              disabled={!validQty || adding}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add to order"}
            </button>
          </div>
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
