"use client";

import { useState, useEffect } from "react";
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

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setProduct(null) : setProduct(d)))
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit product</h1>
        <Link href="/admin/products" className="text-sm text-gray-500 hover:underline mb-6 inline-block">← Products</Link>
        <ProductForm initial={initial} onSubmit={handleSubmit} submitLabel="Save changes" />
      </div>
    </main>
  );
}
