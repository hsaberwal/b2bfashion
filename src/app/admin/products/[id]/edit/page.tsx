"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductForm, type ProductFormData, type ProductSubmitPayload } from "@/components/admin/ProductForm";

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
  images?: string[];
  packSize: number;
  pricePerItem?: number;
  compareAtPrice?: number;
};

function imageDisplaySrc(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return `/api/admin/images/signed?key=${encodeURIComponent(u)}`;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateNumImages, setGenerateNumImages] = useState(1);
  const [generateImageIndex, setGenerateImageIndex] = useState(0);

  const refetchProduct = useCallback(() => {
    return fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setProduct(null) : setProduct(d)));
  }, [id]);

  useEffect(() => {
    refetchProduct().finally(() => setLoading(false));
  }, [refetchProduct]);

  async function handleSubmit(data: ProductSubmitPayload) {
    const payload = {
      sku: data.sku,
      productCode: data.productCode || undefined,
      name: data.name,
      description: data.description || undefined,
      longDescription: data.longDescription || undefined,
      materials: data.materials || undefined,
      careGuide: data.careGuide || undefined,
      category: data.category,
      stockCategory: data.stockCategory,
      colour: data.colour,
      colours: data.colours?.length ? data.colours : undefined,
      sizes: data.sizes?.length ? data.sizes : undefined,
      images: data.images?.length ? data.images : undefined,
      packSize: data.packSize,
      pricePerItem: data.pricePerItem,
      compareAtPrice: data.compareAtPrice,
    };
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Failed to update product");
    router.push("/admin/products");
  }

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-500">Loading…</p></main>;
  if (!product) return <main className="min-h-screen p-8"><p className="text-gray-500">Product not found.</p><Link href="/admin/products" className="text-blue-600 hover:underline">← Products</Link></main>;

  const initial: Partial<ProductFormData> = {
    sku: product.sku,
    productCode: product.productCode ?? "",
    name: product.name,
    description: product.description ?? "",
    longDescription: product.longDescription ?? "",
    materials: product.materials ?? "",
    careGuide: product.careGuide ?? "",
    category: product.category,
    stockCategory: product.stockCategory,
    colour: product.colour,
    colours: product.colours ?? [],
    sizes: product.sizes ?? [],
    images: product.images ?? [],
    packSize: product.packSize,
    pricePerItem: product.pricePerItem != null ? String(product.pricePerItem) : "",
    compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : "",
  };

  const images = product.images ?? [];
  const hasImages = images.length > 0;

  async function handleGenerateModelPhotos() {
    if (!hasImages) {
      alert("Add at least one product image first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generate-model-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          imageIndex: generateImageIndex,
          prompt: generatePrompt.trim() || undefined,
          num_images: generateNumImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Generation failed");
        return;
      }
      const newUrls = (data.urls ?? []) as string[];
      if (newUrls.length === 0) {
        alert("No images were generated.");
        return;
      }
      const updatedImages = [...images, ...newUrls];
      const patchRes = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: updatedImages }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        alert(patchData.error ?? "Failed to add images to product");
        return;
      }
      await refetchProduct();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit product</h1>
        <Link href="/admin/products" className="text-sm text-gray-500 hover:underline mb-6 inline-block">← Products</Link>

        {/* Generate model photos (FASHN) */}
        <section className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Generate model photos</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-2">
            <p className="font-medium text-gray-700 dark:text-gray-300">How to use the AI</p>
            <ul className="list-decimal list-inside space-y-1 ml-1">
              <li>Add all garment photos to this product first (front, back, sides, details) using the Images section below.</li>
              <li>FASHN accepts <strong>one image per run</strong>. Choose which photo to send using the &quot;Garment image&quot; dropdown (Image 1, Image 2, …).</li>
              <li>Optionally describe background and styling in the prompt (e.g. studio background, matching shoes, minimal accessories).</li>
              <li>Click &quot;Generate model photos&quot;. When it finishes, new model photos are added to the product.</li>
              <li>To get model shots from other angles: select a different image in the dropdown and run Generate again. Each run adds more photos.</li>
            </ul>
          </div>
          {!hasImages ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">Add at least one product image below first.</p>
          ) : (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Garment image</label>
                <select
                  value={generateImageIndex}
                  onChange={(e) => setGenerateImageIndex(Number(e.target.value))}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                >
                  {images.map((_, i) => (
                    <option key={i} value={i}>Image {i + 1}</option>
                  ))}
                </select>
                {images[generateImageIndex] && (
                  <img
                    src={imageDisplaySrc(images[generateImageIndex])}
                    alt="Garment"
                    className="mt-2 w-24 h-24 object-contain rounded border border-gray-200 dark:border-gray-700"
                  />
                )}
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prompt (background, shoes, accessories)</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Describe the scene and styling. Leave blank for the AI to choose.
                </p>
                <textarea
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="e.g. Display on a model in a chilly autumn scene, wearing boots."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Example prompts — click to use:</p>
                <ul className="flex flex-wrap gap-2">
                  {[
                    { label: "Chilly autumn, white dress & boots", prompt: "Display on a model wearing a white dress with boots in a chilly autumn scene." },
                    { label: "Studio, heels, minimal jewellery", prompt: "Studio background, model in neutral heels and minimal jewellery." },
                    { label: "Outdoor casual, sneakers", prompt: "Casual outdoor setting, model in sneakers and simple accessories." },
                    { label: "Elegant indoor, heels & gold", prompt: "Elegant indoor setting, model in heels and subtle gold accessories." },
                    { label: "Minimal white backdrop", prompt: "Minimal white backdrop, clean look, no extra accessories." },
                  ].map(({ label, prompt }) => (
                    <li key={prompt}>
                      <button
                        type="button"
                        onClick={() => setGeneratePrompt(prompt)}
                        className="text-left px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={prompt}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Number of images:</span>
                  <select
                    value={generateNumImages}
                    onChange={(e) => setGenerateNumImages(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateModelPhotos}
                  disabled={generating}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
                >
                  {generating ? "Generating…" : "Generate model photos"}
                </button>
              </div>
            </>
          )}
        </section>

        <ProductForm
          key={JSON.stringify(product.images)}
          initial={initial}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
        />
      </div>
    </main>
  );
}
