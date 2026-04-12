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
  sizeRatio: number[];
  images: string[];
  featured: boolean;
  showOnHero: boolean;
  latestLooks: boolean;
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
  sizeRatio: [],
  images: [],
  featured: false,
  showOnHero: false,
  latestLooks: false,
  packSize: 6,
  pricePerItem: "",
  compareAtPrice: "",
};

export type ProductSubmitPayload = Omit<ProductFormData, "pricePerItem" | "compareAtPrice" | "colours" | "sizes" | "sizeRatio"> & {
  pricePerItem?: number;
  compareAtPrice?: number;
  colours?: string[];
  sizes?: string[];
  sizeRatio?: number[];
  featured?: boolean;
  showOnHero?: boolean;
  latestLooks?: boolean;
};

function imageDisplaySrc(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return `/api/admin/images/signed?key=${encodeURIComponent(u)}`;
}

const EXAMPLE_PROMPTS = [
  { label: "Studio, heels, minimal", prompt: "Studio background, neutral heels and minimal jewellery." },
  { label: "Autumn, boots", prompt: "Chilly autumn scene, wearing boots and a light scarf." },
  { label: "Outdoor casual", prompt: "Casual outdoor setting, sneakers and simple accessories." },
  { label: "Elegant indoor", prompt: "Elegant indoor setting, heels and subtle gold accessories." },
  { label: "White backdrop", prompt: "Minimal white backdrop, clean look, no extra accessories." },
  { label: "City street", prompt: "Urban city street background, stylish handbag, walking pose." },
];

type Props = {
  initial?: Partial<ProductFormData>;
  onSubmit: (data: ProductSubmitPayload) => Promise<void>;
  submitLabel: string;
  productId?: string;
};

export function ProductForm({ initial, onSubmit, submitLabel, productId }: Props) {
  const [form, setForm] = useState<ProductFormData>({ ...defaultForm, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);
  const [labelPhotos, setLabelPhotos] = useState<File[]>([]);
  const [labelPreviews, setLabelPreviews] = useState<string[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateNumImages, setGenerateNumImages] = useState(1);
  const [generateFromIndex, setGenerateFromIndex] = useState<number | null>(null);
  const [generateView, setGenerateView] = useState<"front" | "back">("front");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    if (generateFromIndex === index) setGenerateFromIndex(null);
  };

  /** Reorder images via drag-and-drop */
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...form.images];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    update("images", reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const newImages = [...form.images];
      for (let f = 0; f < files.length; f++) {
        const fd = new FormData();
        fd.set("file", files[f]);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error ?? `Upload failed for file ${f + 1}`);
          continue;
        }
        newImages.push(data.url);
      }
      update("images", newImages);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /** Generate AI model photos from a specific image */
  const handleGenerateFromImage = async (imageIndex: number) => {
    if (!productId) {
      alert("Save the product first, then generate AI photos from the edit page.");
      return;
    }
    setGeneratingAI(true);
    setGenerateFromIndex(null);

    try {
      // Step 1: Save current images to DB first so FASHN can access the image
      setAiStatus("Saving images...");
      const saveRes = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: form.images }),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json();
        alert(saveData.error ?? "Failed to save images before generating.");
        setGeneratingAI(false);
        setAiStatus("");
        return;
      }

      // Step 2: Generate model photos
      setAiStatus(`Generating ${generateNumImages} model photo${generateNumImages > 1 ? "s" : ""} from Image ${imageIndex + 1}... (this may take 1-2 minutes)`);
      const res = await fetch("/api/admin/generate-model-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageIndex,
          prompt: generatePrompt.trim() || undefined,
          view: generateView,
          num_images: generateNumImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "AI generation failed. Check that FASHN_API_KEY is set.");
        setAiStatus(`Failed: ${data.error ?? "unknown error"}`);
        setTimeout(() => { setGeneratingAI(false); setAiStatus(""); }, 5000);
        return;
      }
      const newUrls = (data.urls ?? []) as string[];
      if (newUrls.length > 0) {
        const updatedImages = [...form.images, ...newUrls];
        setForm((prev) => ({ ...prev, images: updatedImages }));
        // Save generated images to DB
        await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: updatedImages }),
        });
        setAiStatus(`${newUrls.length} model photo${newUrls.length > 1 ? "s" : ""} generated!`);
      } else {
        setAiStatus("No photos returned.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      alert(`AI generation error: ${msg}`);
      setAiStatus("Generation failed.");
    } finally {
      setTimeout(() => {
        setGeneratingAI(false);
        setAiStatus("");
      }, 5000);
    }
  };

  /** Add a label photo to the queue */
  const handleAddLabelPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLabelPhotos((prev) => [...prev, file]);
    setLabelPreviews((prev) => [...prev, URL.createObjectURL(file)]);
    e.target.value = "";
  };

  /** Remove a label photo from the queue */
  const removeLabelPhoto = (index: number) => {
    URL.revokeObjectURL(labelPreviews[index]);
    setLabelPhotos((prev) => prev.filter((_, i) => i !== index));
    setLabelPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /** Send all queued label photos to Claude for scanning */
  const handleScanLabels = async () => {
    if (labelPhotos.length === 0) return;
    setScanningLabel(true);
    try {
      const fd = new FormData();
      for (const file of labelPhotos) {
        fd.append("files", file);
      }
      const res = await fetch("/api/admin/scan-label", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Label scan failed");
        return;
      }
      setForm((prev) => ({
        ...prev,
        sku: data.sku || prev.sku,
        productCode: data.productCode || prev.productCode,
        name: data.name || prev.name,
        materials: data.materials || prev.materials,
        careGuide: data.careGuide || prev.careGuide,
        sizes: data.sizes?.length ? data.sizes : prev.sizes,
        colour: data.colour || prev.colour,
        pricePerItem: data.pricePerItem || prev.pricePerItem,
      }));
      // Clear the queue after successful scan
      labelPreviews.forEach((url) => URL.revokeObjectURL(url));
      setLabelPhotos([]);
      setLabelPreviews([]);
    } catch {
      alert("Failed to scan labels. Please try again.");
    } finally {
      setScanningLabel(false);
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
        sizeRatio: form.sizeRatio.length ? form.sizeRatio : undefined,
        packSize: form.sizeRatio.length
          ? form.sizeRatio.reduce((sum, n) => sum + n, 0) || 1
          : form.packSize,
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

      {/* ===== QUICK ACTIONS: Label Scanner + Photo Upload ===== */}
      <div className="space-y-3">
        {/* Scan Labels — multi-photo capture */}
        <div className={`p-5 border-2 border-dashed rounded-lg transition-all ${
          scanningLabel
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
        }`}>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              {scanningLabel ? (
                <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600 dark:text-gray-400">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {scanningLabel ? "Scanning labels..." : "Scan Care Labels"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Take photos of each label (materials, care symbols, sizes) then scan all at once
              </p>
            </div>
          </div>

          {/* Label photo previews */}
          {labelPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {labelPreviews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`Label ${i + 1}`} className="w-20 h-20 object-cover rounded border border-gray-200 dark:border-gray-700" />
                  <button
                    type="button"
                    onClick={() => removeLabelPhoto(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Take / add another photo */}
            <label className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {labelPhotos.length === 0 ? "Take Photo" : "Add Another"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAddLabelPhoto}
                className="hidden"
                disabled={scanningLabel}
              />
            </label>

            {/* Pick from gallery */}
            <label className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                From Gallery
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files) return;
                  for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setLabelPhotos((prev) => [...prev, file]);
                    setLabelPreviews((prev) => [...prev, URL.createObjectURL(file)]);
                  }
                  e.target.value = "";
                }}
                className="hidden"
                disabled={scanningLabel}
              />
            </label>

            {/* Scan all button */}
            {labelPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleScanLabels}
                disabled={scanningLabel}
                className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 disabled:opacity-50"
              >
                {scanningLabel ? "Scanning..." : `Scan ${labelPhotos.length} Label${labelPhotos.length > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>

        {/* Upload Photos */}
        <label className={`flex items-center gap-4 p-5 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
          uploading
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-500 bg-white dark:bg-gray-900"
        }`}>
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            {uploading ? (
              <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600 dark:text-gray-400">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {uploading ? "Uploading..." : "Upload Product Photos"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add garment photos (front, back, details)
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {/* ===== IMAGES + AI GENERATION ===== */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Product Images ({form.images.length})
        </label>

        {/* AI generation status */}
        {(generatingAI || aiStatus) && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <span className="flex items-center gap-2 text-sm">
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

        {/* Image grid with drag-to-reorder and per-image AI button */}
        {form.images.length > 0 ? (
          <>
            {form.images.length > 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Drag to reorder — first image is used as the main photo
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {form.images.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className={`relative group cursor-grab active:cursor-grabbing transition-all ${
                    dragIndex === i ? "opacity-40 scale-95" : ""
                  } ${dragOverIndex === i && dragIndex !== i ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="aspect-[3/4] overflow-hidden rounded border border-gray-200 dark:border-gray-700 bg-gray-50">
                    <img src={imageDisplaySrc(url)} alt="" className="w-full h-full object-cover pointer-events-none" />
                  </div>
                  {/* Position badge */}
                  <span className="absolute top-1 left-1 w-5 h-5 bg-black/60 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                    {i + 1}
                  </span>
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Remove image"
                  >
                    &times;
                  </button>
                  {/* Move buttons for mobile / touch */}
                  {form.images.length > 1 && (
                    <div className="absolute top-7 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const reordered = [...form.images];
                            [reordered[i - 1], reordered[i]] = [reordered[i], reordered[i - 1]];
                            update("images", reordered);
                          }}
                          className="w-6 h-6 bg-black/60 text-white rounded text-xs flex items-center justify-center"
                          title="Move left"
                        >
                          &larr;
                        </button>
                      )}
                      {i < form.images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const reordered = [...form.images];
                            [reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]];
                            update("images", reordered);
                          }}
                          className="w-6 h-6 bg-black/60 text-white rounded text-xs flex items-center justify-center"
                          title="Move right"
                        >
                          &rarr;
                        </button>
                      )}
                    </div>
                  )}
                  {/* AI generate button */}
                  {productId && (
                    <button
                      type="button"
                      onClick={() => setGenerateFromIndex(generateFromIndex === i ? null : i)}
                      disabled={generatingAI}
                      className={`absolute bottom-1 left-1 right-1 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-all ${
                        generateFromIndex === i
                          ? "bg-blue-600 text-white opacity-100"
                          : "bg-black/70 text-white opacity-0 group-hover:opacity-100"
                      } disabled:opacity-30`}
                      title="Generate AI model photo from this image"
                    >
                      AI Generate
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mb-3 p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No images yet. Upload photos above or add a URL.
            </p>
          </div>
        )}

        {/* AI Generation Panel — shown when an image is selected */}
        {generateFromIndex !== null && productId && (
          <div className="mb-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={imageDisplaySrc(form.images[generateFromIndex])}
                alt=""
                className="w-16 h-20 object-cover rounded border border-blue-300"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Generate AI model photos from Image {generateFromIndex + 1}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  FASHN AI will create model photos wearing this garment.
                  Default: women aged 35-55, diverse ethnicities. Add styling below.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Front / Back selector */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  This photo shows the
                </label>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                    generateView === "front"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}>
                    <input
                      type="radio"
                      name="garmentView"
                      value="front"
                      checked={generateView === "front"}
                      onChange={() => setGenerateView("front")}
                      className="sr-only"
                    />
                    Front
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                    generateView === "back"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                  }`}>
                    <input
                      type="radio"
                      name="garmentView"
                      value="back"
                      checked={generateView === "back"}
                      onChange={() => setGenerateView("back")}
                      className="sr-only"
                    />
                    Back
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prompt (optional — describe background, styling)
                </label>
                <textarea
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="e.g. Studio background, model in heels..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EXAMPLE_PROMPTS.map(({ label, prompt }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setGeneratePrompt(prompt)}
                      className="px-2 py-1 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300 text-xs">Photos:</span>
                  <select
                    value={generateNumImages}
                    onChange={(e) => setGenerateNumImages(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateFromImage(generateFromIndex)}
                  disabled={generatingAI}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {generatingAI ? "Generating..." : "Generate"}
                </button>
                <button
                  type="button"
                  onClick={() => setGenerateFromIndex(null)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={addImageUrl} className="text-xs text-gray-500 hover:text-gray-700 underline">
          Add image by URL instead
        </button>
      </div>

      {/* ===== PRODUCT DETAILS ===== */}
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

      {/* Homepage visibility — 3 sections */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Show on homepage</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
            <input
              type="checkbox"
              id="showOnHero"
              checked={form.showOnHero}
              onChange={(e) => update("showOnHero", e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <label htmlFor="showOnHero" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Front Page
              <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">
                Big hero banner &amp; two-column feature
              </span>
            </label>
          </div>
          <div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
            <input
              type="checkbox"
              id="featured"
              checked={form.featured}
              onChange={(e) => update("featured", e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Featured Styles
              <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">
                Product grid section
              </span>
            </label>
          </div>
          <div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
            <input
              type="checkbox"
              id="latestLooks"
              checked={form.latestLooks}
              onChange={(e) => update("latestLooks", e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <label htmlFor="latestLooks" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Our Latest Looks
              <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">
                Rotating image gallery
              </span>
            </label>
          </div>
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
      {/* Size Ratio Builder */}
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Pack Size Ratio
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Define the sizes in each pack and how many of each. Pack size is calculated automatically.
        </p>

        {/* Add size button */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            id="newSizeInput"
            placeholder="Add a size (e.g. S, M, L, XL, 10, 12...)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const input = e.currentTarget;
                const val = input.value.trim();
                if (val && !form.sizes.includes(val)) {
                  update("sizes", [...form.sizes, val]);
                  update("sizeRatio", [...form.sizeRatio, 1]);
                  input.value = "";
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById("newSizeInput") as HTMLInputElement;
              const val = input?.value?.trim();
              if (val && !form.sizes.includes(val)) {
                update("sizes", [...form.sizes, val]);
                update("sizeRatio", [...form.sizeRatio, 1]);
                input.value = "";
              }
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Add
          </button>
        </div>

        {/* Quick add common sizes */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {["XS", "S", "M", "L", "XL", "XXL", "8", "10", "12", "14", "16", "18", "20"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (!form.sizes.includes(s)) {
                  update("sizes", [...form.sizes, s]);
                  update("sizeRatio", [...form.sizeRatio, 1]);
                }
              }}
              disabled={form.sizes.includes(s)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                form.sizes.includes(s)
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Size ratio table */}
        {form.sizes.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_40px] gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Size</span>
              <span>Qty per pack</span>
              <span></span>
            </div>
            {form.sizes.map((size, i) => (
              <div key={size} className="grid grid-cols-[1fr_80px_40px] gap-2 items-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{size}</span>
                <input
                  type="number"
                  min={0}
                  value={form.sizeRatio[i] ?? 1}
                  onChange={(e) => {
                    const newRatio = [...form.sizeRatio];
                    newRatio[i] = Math.max(0, parseInt(e.target.value, 10) || 0);
                    update("sizeRatio", newRatio);
                    // Auto-calculate pack size
                    update("packSize", newRatio.reduce((sum, n) => sum + n, 0));
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm text-center"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newSizes = form.sizes.filter((_, j) => j !== i);
                    const newRatio = form.sizeRatio.filter((_, j) => j !== i);
                    update("sizes", newSizes);
                    update("sizeRatio", newRatio);
                    update("packSize", newRatio.reduce((sum, n) => sum + n, 0) || 1);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm"
                >
                  &times;
                </button>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Pack size: {form.sizeRatio.reduce((sum, n) => sum + n, 0) || 0} items
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ratio: {form.sizes.map((s, i) => `${form.sizeRatio[i] ?? 0}×${s}`).join(", ")}
              </span>
            </div>
          </div>
        )}

        {form.sizes.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No sizes added. Click sizes above or type a custom size.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pack size</label>
          <input
            type="number"
            min={1}
            value={form.packSize}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white cursor-not-allowed"
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
