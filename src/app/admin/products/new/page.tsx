"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductForm, type ProductSubmitPayload } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();

  async function handleSubmit(data: ProductSubmitPayload) {
    const payload = {
      sku: data.sku,
      brandCode: data.brandCode || undefined,
      brand: data.brand || undefined,
      season: data.season || undefined,
      name: data.name,
      description: data.description || undefined,
      longDescription: data.longDescription || undefined,
      materials: data.materials || undefined,
      careGuide: data.careGuide || undefined,
      category: data.category,
      stockCategory: data.stockCategory,
      colour: data.colour,
      sizes: data.sizes?.length ? data.sizes : undefined,
      sizeRatio: data.sizeRatio?.length ? data.sizeRatio : undefined,
      images: data.images?.length ? data.images : undefined,
      packSize: typeof data.packSize === "number" ? data.packSize : Number(data.packSize) || 1,
      minPacks: data.minPacks,
      pricePerPiece: data.pricePerPiece,
      packsInStock: data.packsInStock,
      disabled: data.disabled,
    };
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      const msg = result.details
        ? `${result.error}: ${JSON.stringify(result.details)}`
        : (result.error ?? "Failed to create product");
      throw new Error(msg);
    }
    router.push("/admin/products");
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/products" className="text-sm text-gray-500 hover:text-gray-900 hover:underline mb-3 inline-block">← Products</Link>
        <h1 className="font-serif text-2xl md:text-3xl text-gray-900 mb-4 md:mb-6">Add product</h1>
        <ProductForm onSubmit={handleSubmit} submitLabel="Create product" />
      </div>
    </div>
  );
}
