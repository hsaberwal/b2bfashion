"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  colour: string;
  packSize: number;
  pricePerPiece?: number;
  packsInStock?: number;
  packsReserved?: number;
  images?: string[];
  disabled?: boolean;
};

export default function AdminProductsPage() {
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }, [user?.role]);

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Delete failed");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function toggleDisabled(id: string, disabled: boolean) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Failed to update visibility");
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, disabled } : p)));
  }

  if (user === null || (user && user.role !== "admin")) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-gray-500">{user === null ? "Loading…" : "Admin only."}</p>
        <Link href="/admin" className="text-blue-600 hover:underline mt-4 inline-block">← Admin</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage products
          </h1>
          <div className="flex gap-3">
            <Link
              href="/admin/products/import"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Bulk Import
            </Link>
            <Link
              href="/admin/products/new"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add product
            </Link>
          </div>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:underline mb-6 inline-block">
          ← Admin
        </Link>

        {loading ? (
          <p className="text-gray-500">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-gray-500">
            No products yet. <Link href="/admin/products/new" className="text-blue-600 hover:underline">Add one</Link> or seed sample products from Admin.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white dark:bg-gray-900 dark:border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Image</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">SKU</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Name</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Category</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Colour</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Pack</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Price</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Stock</th>
                  <th className="p-3 font-medium text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-gray-200 dark:border-gray-800 ${p.disabled ? "opacity-60" : ""}`}
                  >
                    <td className="p-3">
                      {p.images?.[0] ? (
                        <img src={imageDisplayUrl(p.images[0], { forAdmin: true })} alt="" className="w-12 h-12 object-contain rounded" />
                      ) : (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-gray-700 dark:text-gray-300">{p.sku}</td>
                    <td className="p-3 text-gray-900 dark:text-white">
                      {p.name}
                      {p.disabled && (
                        <span className="ml-2 inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Hidden
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.category}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.colour}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.packSize}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">
                      {p.pricePerPiece != null ? (
                        <span>
                          £{p.pricePerPiece.toFixed(2)}
                          <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                            pack £{(p.pricePerPiece * (p.packSize ?? 1)).toFixed(2)}
                          </span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {(() => {
                        const inStock = p.packsInStock ?? 0;
                        const reserved = p.packsReserved ?? 0;
                        const avail = Math.max(0, inStock - reserved);
                        const colour = avail === 0 ? "text-red-600" : avail < 5 ? "text-amber-600" : "text-green-700";
                        return (
                          <div className={`font-medium ${colour}`}>
                            <div>{avail} avail</div>
                            {reserved > 0 && (
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {inStock} total &middot; {reserved} reserved
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Link href={`/admin/products/${p.id}/edit`} className="text-blue-600 hover:underline mr-3">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleDisabled(p.id, !p.disabled)}
                        className="text-amber-700 hover:underline mr-3 dark:text-amber-400"
                      >
                        {p.disabled ? "Show" : "Hide"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(p.id, p.name)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
