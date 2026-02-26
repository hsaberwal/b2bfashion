"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductForm, type ProductSubmitPayload } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();

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
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Failed to create product");
    router.push("/admin/products");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add product</h1>
        <Link href="/admin/products" className="text-sm text-gray-500 hover:underline mb-6 inline-block">← Products</Link>
        <ProductForm onSubmit={handleSubmit} submitLabel="Create product" />
      </div>
    </main>
  );
}
