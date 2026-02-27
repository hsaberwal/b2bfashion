"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockCategory: string;
  colour: string;
  images: string[];
  packSize: number;
  pricePerItem?: number;
};

const STOCK_LABELS: Record<string, string> = {
  previous: "Previous year stock",
  current: "Current stock",
  forward: "Forward / upcoming stock",
};

const PRODUCT_CATEGORIES = [
  "Tops",
  "Blouses",
  "T-shirts",
  "Knitwear",
  "Cardigans",
  "Jumpers",
  "Trousers",
  "Dresses",
  "Skirts",
  "Jackets",
  "Sale",
  "Other",
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<string>("current");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [colourFilter, setColourFilter] = useState<string>("");
  const [user, setUser] = useState<{ pricingApproved?: boolean; role?: string; canViewForwardStock?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (user && !user.canViewForwardStock && stockFilter === "forward") {
      setStockFilter("current");
    }
  }, [user, stockFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stockFilter) params.set("stockCategory", stockFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (colourFilter) params.set("colour", colourFilter);
    fetch(`/api/products?${params}`)
      .then((r) => {
        if (r.status === 403) return r.json().then((d) => Promise.reject(new Error(d.error)));
        return r.json();
      })
      .then((d) => setProducts(d.products ?? []))
      .catch((e) => {
        console.error(e);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [stockFilter, categoryFilter, colourFilter]);

  const colours = Array.from(new Set(products.map((p) => p.colour))).sort();

  return (
    <main className="min-h-screen p-4 md:p-8 bg-je-cream">
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-je-black tracking-tight">
            Products
          </h1>
          <p className="text-je-muted text-sm mt-0.5">
            Claudia B2B — bulk ordering only (pack sizes apply)
          </p>
        </div>
        <nav className="flex gap-2">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="px-4 py-2 border border-je-charcoal text-je-charcoal hover:bg-je-offwhite transition-colors"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/cart"
                className="px-4 py-2 border border-je-border bg-je-white text-je-black hover:bg-je-offwhite transition-colors"
              >
                Cart / Orders
              </Link>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                }}
                className="px-4 py-2 bg-je-black text-je-white hover:bg-je-charcoal transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-je-black text-je-white hover:bg-je-charcoal transition-colors"
            >
              Log in
            </Link>
          )}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 shrink-0 space-y-4 p-4 bg-je-white border border-je-border">
          <div>
            <label className="block text-sm font-medium text-je-black mb-1">
              Stock section
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
            >
              <option value="current">Current stock</option>
              <option value="previous">Previous year stock</option>
              {user?.canViewForwardStock && (
                <option value="forward">Forward / upcoming stock</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-je-black mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
            >
              <option value="">All</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-je-black mb-1">
              Colour
            </label>
            <select
              value={colourFilter}
              onChange={(e) => setColourFilter(e.target.value)}
              className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
            >
              <option value="">All</option>
              {colours.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </aside>

        <div className="flex-1">
          {!user?.pricingApproved && (
            <p className="mb-4 text-sm text-je-charcoal bg-je-offwhite border border-je-border px-3 py-2">
              Pricing is hidden until your account is approved. You can still browse and add to cart.
            </p>
          )}
          {loading ? (
            <p className="text-je-muted">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-je-muted">
              No products in this section. Try another filter.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border border-je-border overflow-hidden bg-je-white hover:border-je-charcoal transition-colors"
                >
                  <div className="aspect-square bg-je-offwhite flex items-center justify-center">
                    {p.images?.[0] ? (
                      <img
                        src={imageDisplayUrl(p.images[0])}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-je-muted text-sm">No image</span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-je-muted font-medium">{p.sku}</p>
                    <h2 className="font-medium text-je-black truncate mt-0.5">
                      {p.name}
                    </h2>
                    <p className="text-sm text-je-muted mt-1">
                      {p.category} · {p.colour}
                    </p>
                    <p className="text-sm text-je-muted mt-1">
                      Pack size: {p.packSize} · {STOCK_LABELS[p.stockCategory] ?? p.stockCategory}
                    </p>
                    {user?.pricingApproved && p.pricePerItem != null && (
                      <p className="mt-2 font-semibold text-je-black screenshot-protected relative">
                        £{p.pricePerItem.toFixed(2)} per item
                      </p>
                    )}
                    <Link
                      href={`/products/${p.id}`}
                      className="mt-3 inline-block text-sm text-je-black font-medium underline hover:no-underline"
                    >
                      View & add to order
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
