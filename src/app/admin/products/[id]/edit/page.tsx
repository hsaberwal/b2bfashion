"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductForm, type ProductFormData, type ProductSubmitPayload } from "@/components/admin/ProductForm";

type Product = {
  id: string;
  sku: string;
  brandCode?: string;
  brand?: string;
  season?: string;
  name: string;
  description?: string;
  longDescription?: string;
  materials?: string;
  careGuide?: string;
  category: string;
  stockCategory: string;
  colour: string;
  sizes?: string[];
  sizeRatio?: number[];
  images?: string[];
  featured?: boolean;
  showOnHero?: boolean;
  latestLooks?: boolean;
  heroFocalPoint?: string;
  heroImageIndex?: number;
  heroExcludedIndexes?: number[];
  minPacks?: number;
  packSize: number;
  pricePerPack?: number;
  packsInStock?: number;
  packsReserved?: number;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

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
      featured: data.featured,
      showOnHero: data.showOnHero,
      latestLooks: data.latestLooks,
      heroFocalPoint: data.heroFocalPoint,
      heroImageIndex: data.heroImageIndex,
      heroExcludedIndexes: data.heroExcludedIndexes,
      minPacks: data.minPacks,
      packSize: data.packSize,
      pricePerPack: data.pricePerPack,
      packsInStock: data.packsInStock,
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

  if (loading) return <main className="min-h-screen p-8"><p className="text-gray-500">Loading...</p></main>;
  if (!product) return <main className="min-h-screen p-8"><p className="text-gray-500">Product not found.</p><Link href="/admin/products" className="text-blue-600 hover:underline">&larr; Products</Link></main>;

  const initial: Partial<ProductFormData> = {
    sku: product.sku,
    brandCode: product.brandCode ?? "CL",
    brand: product.brand ?? "CLAUDIA-C",
    season: product.season ?? "SS26",
    name: product.name,
    description: product.description ?? "",
    longDescription: product.longDescription ?? "",
    materials: product.materials ?? "",
    careGuide: product.careGuide ?? "",
    category: product.category,
    stockCategory: product.stockCategory,
    colour: product.colour,
    sizes: product.sizes ?? [],
    sizeRatio: product.sizeRatio ?? [],
    images: product.images ?? [],
    featured: product.featured ?? false,
    showOnHero: product.showOnHero ?? false,
    latestLooks: product.latestLooks ?? false,
    heroFocalPoint: product.heroFocalPoint ?? "50% 50%",
    heroImageIndex: product.heroImageIndex ?? 0,
    heroExcludedIndexes: product.heroExcludedIndexes ?? [],
    minPacks: product.minPacks ?? 1,
    packSize: product.packSize,
    pricePerPack: product.pricePerPack != null ? String(product.pricePerPack) : "",
    packsInStock: product.packsInStock ?? 0,
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit product</h1>
        <Link href="/admin/products" className="text-sm text-gray-500 hover:underline mb-6 inline-block">&larr; Products</Link>

        <ProductForm
          key={JSON.stringify(product.images)}
          initial={initial}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
          productId={id}
        />
      </div>
    </main>
  );
}
