"use client";

import { useState, useCallback } from "react";

const PRODUCT_CATEGORIES = [
  "Tops", "Blouses", "T-shirts", "Knitwear", "Cardigans", "Jumpers",
  "Trousers", "Dresses", "Skirts", "Jackets", "Sale", "Other",
];

export type ProductFormData = {
  sku: string;
  productCode: string;
  name: string;
  description: string;
  longDescription: string;
  materials: string;
  careGuide: string;
  category: string;
  stockCategory: string;
  colour: string;
  colours: string[];
  sizes: string[];
  images: string[];
  packSize: number;
  pricePerItem: string;
  compareAtPrice: string;
};

const defaultForm: ProductFormData = {
  sku: "",
  productCode: "",
  name: "",
  description: "",
  longDescription: "",
  materials: "",
  careGuide: "",
  category: "Tops",
  stockCategory: "current",
  colour: "",
  colours: [],
  sizes: [],
  images: [],
  packSize: 6,
  pricePerItem: "",
  compareAtPrice: "",
};

export type ProductSubmitPayload = Omit<ProductFormData, "pricePerItem" | "compareAtPrice" | "colours" | "sizes"> & {
  pricePerItem?: number;
  compareAtPrice?: number;
  colours?: string[];
  sizes?: string[];
};

/** Blob keys (Image Service) need a signed URL for display; full URLs and /api/uploads/ work as-is. */
function imageDisplaySrc(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return `/api/admin/images/signed?key=${encodeURIComponent(u)}`;
}

type Props = {
  initial?: Partial<ProductFormData>;
  onSubmit: (data: ProductSubmitPayload) => Promise<void>;
  submitLabel: string;
};

export function ProductForm({ initial, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<ProductFormData>({ ...defaultForm, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const update = useCallback(<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addImageUrl = () => {
    const url = prompt("Image URL:");
    if (url?.trim()) {
      update("images", [...form.images, url.trim()]);
    }
  };

  const removeImage = (index: number) => {
    update("images", form.images.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Upload failed");
        return;
      }
      update("images", [...form.images, data.url]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload: ProductSubmitPayload = {
        ...form,
        pricePerItem: form.pricePerItem ? parseFloat(form.pricePerItem) : undefined,
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
        colours: form.colours.length ? form.colours : undefined,
        sizes: form.sizes.filter(Boolean).length ? form.sizes.filter(Boolean) : undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU *</label>
          <input
            type="text"
            value={form.sku}
            onChange={(e) => update("sku", e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product code</label>
          <input
            type="text"
            value={form.productCode}
            onChange={(e) => update("productCode", e.target.value)}
            placeholder="e.g. 7016-W"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short description</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Long description</label>
        <textarea
          value={form.longDescription}
          onChange={(e) => update("longDescription", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materials</label>
        <input
          type="text"
          value={form.materials}
          onChange={(e) => update("materials", e.target.value)}
          placeholder="e.g. 100% Polyester"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Care guide</label>
        <input
          type="text"
          value={form.careGuide}
          onChange={(e) => update("careGuide", e.target.value)}
          placeholder="e.g. Wash with similar colours, Iron on reverse"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock section *</label>
          <select
            value={form.stockCategory}
            onChange={(e) => update("stockCategory", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="current">Current</option>
            <option value="previous">Previous year</option>
            <option value="forward">Forward</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary colour *</label>
        <input
          type="text"
          value={form.colour}
          onChange={(e) => update("colour", e.target.value)}
          required
          placeholder="e.g. Mocha"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Colour options (comma-separated)</label>
        <input
          type="text"
          value={Array.isArray(form.colours) ? form.colours.join(", ") : ""}
          onChange={(e) => update("colours", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder="e.g. Mocha, Rust, Black"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sizes (one per line or comma)</label>
        <textarea
          value={Array.isArray(form.sizes) ? form.sizes.join("\n") : ""}
          onChange={(e) => update("sizes", e.target.value.split(/[\n,]/).map((s) => s.trim()))}
          rows={6}
          placeholder="UK: 10 - EU: 36 - US: XS&#10;UK: 12 - EU: 38 - US: S"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Images</label>
        <div className="flex flex-wrap gap-2 mb-2">
          <button type="button" onClick={addImageUrl} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
            Add URL
          </button>
          <label className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 cursor-pointer">
            {uploading ? "Uploading…" : "Upload file"}
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.images.map((url, i) => (
            <div key={i} className="relative group">
              <img src={imageDisplaySrc(url)} alt="" className="w-20 h-20 object-contain rounded border border-gray-200 dark:border-gray-700" />
              <button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pack size *</label>
          <input
            type="number"
            min={1}
            value={form.packSize}
            onChange={(e) => update("packSize", parseInt(e.target.value, 10) || 1)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price per item (£)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.pricePerItem}
            onChange={(e) => update("pricePerItem", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Compare at price (£)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.compareAtPrice}
            onChange={(e) => update("compareAtPrice", e.target.value)}
            placeholder="Was £"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-4">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
