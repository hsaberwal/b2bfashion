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
  featured: boolean;
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
  featured: false,
  packSize: 6,
  pricePerItem: "",
  compareAtPrice: "",
};

export type ProductSubmitPayload = Omit<ProductFormData, "pricePerItem" | "compareAtPrice" | "colours" | "sizes"> & {
  pricePerItem?: number;
  compareAtPrice?: number;
  colours?: string[];
  sizes?: string[];
  featured?: boolean;
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
  /** Product ID — required for auto-generating model photos on upload */
  productId?: string;
};

export function ProductForm({ initial, onSubmit, submitLabel, productId }: Props) {
  const [form, setForm] = useState<ProductFormData>({ ...defaultForm, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState("");

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

  /** Upload a garment image, then auto-trigger FASHN model photo generation */
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
      const newImages = [...form.images, data.url];
      update("images", newImages);

      // Auto-generate model photo if we have a product ID
      if (productId) {
        triggerModelPhotoGeneration(productId, newImages.length - 1);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /** Fire-and-forget model photo generation in the background */
  const triggerModelPhotoGeneration = async (pid: string, imageIndex: number) => {
    setGeneratingAI(true);
    setAiStatus("Generating model photo...");
    try {
      const res = await fetch("/api/admin/generate-model-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: pid,
          imageIndex,
          num_images: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiStatus(`Model photo: ${data.error ?? "failed"}`);
        return;
      }
      const newUrls = (data.urls ?? []) as string[];
      if (newUrls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...newUrls],
        }));
        // Also save to product
        await fetch(`/api/admin/products/${pid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [...form.images, ...newUrls] }),
        });
        setAiStatus("Model photo generated!");
      } else {
        setAiStatus("No model photos returned.");
      }
    } catch {
      setAiStatus("Model photo generation failed.");
    } finally {
      setTimeout(() => {
        setGeneratingAI(false);
        setAiStatus("");
      }, 3000);
    }
  };

  /** Scan a care/materials label photo and auto-fill fields */
  const handleLabelScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningLabel(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/scan-label", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Label scan failed");
        return;
      }

      // Auto-fill the fields from the label
      setForm((prev) => ({
        ...prev,
        materials: data.materials || prev.materials,
        careGuide: data.careGuide || prev.careGuide,
        sizes: data.sizes?.length ? data.sizes : prev.sizes,
        colour: data.colour || prev.colour,
      }));
    } catch {
      alert("Failed to scan label. Please try again.");
    } finally {
      setScanningLabel(false);
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

      {/* Label Scanner */}
      <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scan care label</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Take a photo of the garment label to auto-fill materials, care guide, sizes, and colour
            </p>
          </div>
          <label className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
            scanningLabel
              ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          }`}>
            {scanningLabel ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M7 8h10M7 12h10M7 16h6" />
                </svg>
                Scan Label
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleLabelScan}
              className="hidden"
              disabled={scanningLabel}
            />
          </label>
        </div>
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

      {/* Featured on homepage */}
      <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
        <input
          type="checkbox"
          id="featured"
          checked={form.featured}
          onChange={(e) => update("featured", e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
        />
        <label htmlFor="featured" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          Feature on homepage
          <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">
            This product will appear in the featured section on the main page
          </span>
        </label>
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

        {/* AI generation status */}
        {(generatingAI || aiStatus) && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
            <span className="flex items-center gap-2">
              {generatingAI && (
                <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span className="text-blue-700 dark:text-blue-300">{aiStatus}</span>
            </span>
          </div>
        )}

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
