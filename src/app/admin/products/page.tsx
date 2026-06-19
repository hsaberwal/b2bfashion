"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";
import {
  availableOf,
  filterProducts,
  sortProducts,
  statusCounts,
  SORT_OPTIONS,
  type StatusFilter,
  type SortKey,
  type SortDir,
} from "@/lib/productFilter";

type StockCategory = "previous" | "current" | "forward";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockCategory?: StockCategory;
  colour: string;
  packSize: number;
  pricePerPiece?: number;
  packsInStock?: number;
  packsReserved?: number;
  images?: string[];
  disabled?: boolean;
};

const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  current: "Current stock",
  forward: "Forward ordering",
  previous: "Previous season",
};

function InlineNumberEditor({
  value,
  onSave,
  format,
  step = 1,
  min = 0,
  integer = false,
  prefix,
  suffix,
}: {
  value: number | undefined;
  onSave: (next: number) => Promise<void>;
  format: (v: number | undefined) => React.ReactNode;
  step?: number;
  min?: number;
  /** When true, only whole numbers are accepted (reject "12.5" client-side). */
  integer?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setDraft(value != null ? String(value) : "");
    setError(null);
    setEditing(true);
  }

  async function commit() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < min) {
      setError(`Must be ≥ ${min}`);
      return;
    }
    if (integer && !Number.isInteger(n)) {
      setError("Whole number only");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(n);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        className="text-left hover:underline decoration-dotted underline-offset-2"
        title="Click to edit"
      >
        {format(value)}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-xs text-gray-500">{prefix}</span>}
      <input
        type="number"
        min={min}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        disabled={saving}
        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      />
      {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
      <button
        type="button"
        onClick={commit}
        disabled={saving}
        className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={saving}
        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-900"
      >
        Cancel
      </button>
      {error && <span className="text-[10px] text-red-600 ml-1">{error}</span>}
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function patchProduct(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      // Surface Zod field errors so the inline editor shows what was wrong
      // (e.g. "pricePerPiece: Expected number, received string") instead
      // of just "Invalid input".
      const fieldErrors = data?.details?.fieldErrors as Record<string, string[]> | undefined;
      if (fieldErrors) {
        const parts = Object.entries(fieldErrors)
          .filter(([, msgs]) => msgs.length > 0)
          .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`);
        if (parts.length > 0) throw new Error(parts.join("; "));
      }
      throw new Error(data?.error ?? "Update failed");
    }
    return data;
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Delete failed");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function setDisabled(id: string, disabled: boolean) {
    try {
      await patchProduct(id, { disabled });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, disabled } : p)));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function setStock(id: string, packsInStock: number) {
    await patchProduct(id, { packsInStock });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, packsInStock } : p)));
  }

  async function setPrice(id: string, pricePerPiece: number) {
    await patchProduct(id, { pricePerPiece });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, pricePerPiece } : p)));
  }

  // Filtered + searched + sorted
  const visible = useMemo(
    () => sortProducts(filterProducts(products, search, filter), sortKey, sortDir),
    [products, search, filter, sortKey, sortDir],
  );

  const counts = useMemo(() => statusCounts(products), [products]);

  const allSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const p of visible) next.delete(p.id);
      } else {
        for (const p of visible) next.add(p.id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkSetDisabled(disabled: boolean) {
    if (!someSelected) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => patchProduct(id, { disabled })));
      setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, disabled } : p)));
      setSelected(new Set());
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    if (!someSelected) return;
    if (!confirm(`Delete ${selected.size} product${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/products/${id}`, { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error("One or more deletes failed");
          }),
        ),
      );
      setProducts((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkSetStockCategory(stockCategory: StockCategory) {
    if (!someSelected) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      await Promise.all(ids.map((id) => patchProduct(id, { stockCategory })));
      setProducts((prev) => prev.map((p) => (selected.has(p.id) ? { ...p, stockCategory } : p)));
      setSelected(new Set());
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  const filterPills: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "active", label: "Active", count: counts.active },
    { key: "hidden", label: "Hidden", count: counts.hidden },
    { key: "low", label: "Low stock", count: counts.low },
    { key: "out", label: "Out of stock", count: counts.out },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">
              {counts.all} total · {counts.active} active · {counts.hidden} hidden
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/products/import"
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50"
            >
              Bulk import
            </Link>
            <Link
              href="/admin/products/new"
              className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Add product
            </Link>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filterPills.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  active
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${active ? "text-white/70" : "text-gray-400"}`}>{f.count}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-3">
          <div className="relative">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU, category, or colour…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-gray-900 focus:outline-none"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Tip: tap a stock or price number to edit it inline. Use Bulk import for spreadsheet updates.
          </p>
        </div>

        {/* Sort */}
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="product-sort" className="text-xs text-gray-500">Sort by</label>
          <select
            id="product-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-gray-900 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white hover:border-gray-300"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? "↑ A–Z" : "↓ Z–A"}
          </button>
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="sticky top-14 z-20 mb-3 bg-gray-900 text-white rounded-lg px-3 py-2 flex flex-wrap items-center gap-2 text-sm shadow">
            <span className="font-medium">{selected.size} selected</span>
            <span className="opacity-50">·</span>
            <button
              type="button"
              onClick={() => bulkSetDisabled(false)}
              disabled={bulkBusy}
              className="px-2.5 py-1 text-xs rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              Show
            </button>
            <button
              type="button"
              onClick={() => bulkSetDisabled(true)}
              disabled={bulkBusy}
              className="px-2.5 py-1 text-xs rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              Hide
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              disabled={bulkBusy}
              className="px-2.5 py-1 text-xs rounded bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-50"
            >
              Delete
            </button>
            <span className="opacity-50">·</span>
            <span className="text-xs opacity-70">Stock:</span>
            <button
              type="button"
              onClick={() => bulkSetStockCategory("current")}
              disabled={bulkBusy}
              className="px-2.5 py-1 text-xs rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => bulkSetStockCategory("forward")}
              disabled={bulkBusy}
              className="px-2.5 py-1 text-xs rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              Forward
            </button>
            <button
              type="button"
              onClick={() => bulkSetStockCategory("previous")}
              disabled={bulkBusy}
              className="px-2.5 py-1 text-xs rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto px-2.5 py-1 text-xs rounded bg-white/10 hover:bg-white/20"
            >
              Clear
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-sm text-gray-500">
            Loading products…
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-sm text-gray-500 mb-3">
              {search.trim()
                ? <>No products match &ldquo;{search}&rdquo;.</>
                : filter === "all"
                ? "No products yet."
                : "No products in this filter."}
            </p>
            {!search.trim() && filter === "all" && (
              <Link
                href="/admin/products/new"
                className="inline-block px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Add your first product
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden space-y-2">
              {visible.map((p) => {
                const inStock = p.packsInStock ?? 0;
                const reserved = p.packsReserved ?? 0;
                const avail = availableOf(p);
                const stockColour = avail === 0 ? "text-red-600" : avail < 5 ? "text-amber-600" : "text-green-700";
                const isSel = selected.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-lg p-3 ${
                      isSel ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
                    } ${p.disabled ? "opacity-60" : ""}`}
                  >
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleOne(p.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300"
                      />
                      {p.images?.[0] ? (
                        <img
                          src={imageDisplayUrl(p.images[0], { forAdmin: true })}
                          alt=""
                          className="w-14 h-14 object-cover rounded shrink-0 bg-gray-100"
                        />
                      ) : (
                        <div className="w-14 h-14 shrink-0 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                          No image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="text-sm font-medium text-gray-900 hover:underline truncate block"
                          >
                            {p.name}
                          </Link>
                          {p.disabled && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-100 text-amber-800">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-gray-500 truncate">{p.sku}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.category} · {p.colour} · pack of {p.packSize}
                        </p>
                        {p.stockCategory && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {STOCK_CATEGORY_LABELS[p.stockCategory]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Price /piece</div>
                        <InlineNumberEditor
                          value={p.pricePerPiece}
                          step={0.01}
                          min={0}
                          prefix="£"
                          format={(v) =>
                            v == null ? <span className="text-gray-400">No price</span> : <>£{v.toFixed(2)}</>
                          }
                          onSave={(n) => setPrice(p.id, n)}
                        />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Stock (packs)</div>
                        <InlineNumberEditor
                          value={p.packsInStock}
                          integer
                          format={() => (
                            <span className={`font-medium ${stockColour}`}>
                              {avail} avail
                              {reserved > 0 && (
                                <span className="text-[10px] text-gray-500 font-normal">
                                  {" "}· {inStock} total
                                </span>
                              )}
                            </span>
                          )}
                          onSave={(n) => setStock(p.id, n)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-3 text-sm pt-2 border-t border-gray-100">
                      <Link href={`/admin/products/${p.id}/edit`} className="text-blue-600 hover:underline">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDisabled(p.id, !p.disabled)}
                        className="text-amber-700 hover:underline"
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
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Pack</th>
                    <th className="p-3 font-medium">Price /piece</th>
                    <th className="p-3 font-medium">Stock</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const inStock = p.packsInStock ?? 0;
                    const reserved = p.packsReserved ?? 0;
                    const avail = availableOf(p);
                    const stockColour =
                      avail === 0 ? "text-red-600" : avail < 5 ? "text-amber-600" : "text-green-700";
                    const isSel = selected.has(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-gray-100 hover:bg-gray-50 ${p.disabled ? "opacity-60" : ""} ${isSel ? "bg-gray-50" : ""}`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleOne(p.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {p.images?.[0] ? (
                              <img
                                src={imageDisplayUrl(p.images[0], { forAdmin: true })}
                                alt=""
                                className="w-10 h-10 object-cover rounded bg-gray-100 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-100 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/admin/products/${p.id}/edit`}
                                className="text-sm font-medium text-gray-900 hover:underline truncate block"
                              >
                                {p.name}
                              </Link>
                              <p className="text-xs font-mono text-gray-500">{p.sku} · {p.colour}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-gray-600">
                          {p.category}
                          {p.stockCategory && (
                            <span className="block text-[10px] text-gray-400">
                              {STOCK_CATEGORY_LABELS[p.stockCategory]}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">{p.packSize}</td>
                        <td className="p-3">
                          <InlineNumberEditor
                            value={p.pricePerPiece}
                            step={0.01}
                            min={0}
                            prefix="£"
                            format={(v) =>
                              v == null ? <span className="text-gray-400">—</span> : <>£{v.toFixed(2)}</>
                            }
                            onSave={(n) => setPrice(p.id, n)}
                          />
                        </td>
                        <td className="p-3">
                          <InlineNumberEditor
                            value={p.packsInStock}
                            integer
                            format={() => (
                              <span className={`font-medium ${stockColour}`}>
                                {avail}
                                {reserved > 0 && (
                                  <span className="text-[10px] text-gray-500 font-normal ml-1">
                                    ({inStock} total)
                                  </span>
                                )}
                              </span>
                            )}
                            onSave={(n) => setStock(p.id, n)}
                          />
                        </td>
                        <td className="p-3">
                          {p.disabled ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-100 text-amber-800">
                              Hidden
                            </span>
                          ) : avail === 0 ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-red-100 text-red-800">
                              Out of stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right">
                          <Link href={`/admin/products/${p.id}/edit`} className="text-blue-600 hover:underline mr-3 text-xs">
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDisabled(p.id, !p.disabled)}
                            className="text-amber-700 hover:underline mr-3 text-xs"
                          >
                            {p.disabled ? "Show" : "Hide"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(p.id, p.name)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
