"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [forwardPassword, setForwardPassword] = useState("");
  const [user, setUser] = useState<{ pricingApproved?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stockFilter) params.set("stockCategory", stockFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (colourFilter) params.set("colour", colourFilter);
    if (stockFilter === "forward" && forwardPassword) params.set("forwardPassword", forwardPassword);
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
  }, [stockFilter, categoryFilter, colourFilter, forwardPassword]);

  const colours = Array.from(new Set(products.map((p) => p.colour))).sort();

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Products
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Just Elegance B2B — bulk ordering only (pack sizes apply)
          </p>
        </div>
        <nav className="flex gap-2">
          {user ? (
            <>
              <Link
                href="/cart"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cart / Orders
              </Link>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Log in
            </Link>
          )}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-56 shrink-0 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock section
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="current">Current stock</option>
              <option value="previous">Previous year stock</option>
              <option value="forward">Forward / upcoming stock</option>
            </select>
          </div>
          {stockFilter === "forward" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Section password
              </label>
              <input
                type="password"
                value={forwardPassword}
                onChange={(e) => setForwardPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">All</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Colour
            </label>
            <select
              value={colourFilter}
              onChange={(e) => setColourFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
              Pricing is hidden until your account is approved. You can still browse and add to cart.
            </p>
          )}
          {loading ? (
            <p className="text-gray-500">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-gray-500">
              No products in this section. Try another filter or enter the forward stock password if viewing upcoming stock.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white dark:bg-gray-900 dark:border-gray-800"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">No image</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-mono text-xs text-gray-500">{p.sku}</p>
                    <h2 className="font-medium text-gray-900 dark:text-white truncate">
                      {p.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {p.category} · {p.colour}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Pack size: {p.packSize} · {STOCK_LABELS[p.stockCategory] ?? p.stockCategory}
                    </p>
                    {user?.pricingApproved && p.pricePerItem != null && (
                      <p className="mt-2 font-medium screenshot-protected relative">
                        £{p.pricePerItem.toFixed(2)} per item
                      </p>
                    )}
                    <Link
                      href={`/products/${p.id}`}
                      className="mt-2 inline-block text-sm text-blue-600 hover:underline"
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
