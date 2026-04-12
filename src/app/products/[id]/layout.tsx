import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import mongoose from "mongoose";
import { ProductJsonLd } from "@/components/ProductJsonLd";

type Props = {
  params: Promise<{ id: string }>;
};

const siteUrl = process.env.NEXTAUTH_URL ?? "https://claudia-c.com";

async function fetchProduct(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  try {
    await connectDB();
    const raw = await Product.findById(id)
      .select("name description longDescription category colour images sku")
      .lean();
    if (!raw || Array.isArray(raw)) return null;
    return raw as {
      _id: unknown;
      name?: string;
      description?: string;
      longDescription?: string;
      category?: string;
      colour?: string;
      images?: string[];
      sku?: string;
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return {
      title: "Product Not Found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.name ?? "Garment"} — ${product.colour ?? ""}`.trim();
  const description =
    product.description ||
    product.longDescription?.slice(0, 160) ||
    `${product.name} — wholesale ${product.category?.toLowerCase() ?? "garment"} from Claudia.C. Order in packs at trade prices.`;

  const firstImage = product.images?.[0];
  const imageUrl = firstImage
    ? firstImage.startsWith("http")
      ? firstImage
      : `${siteUrl}/api/images/signed?key=${encodeURIComponent(firstImage)}`
    : `${siteUrl}/icons/icon-512.png`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteUrl}/products/${id}`,
      images: [{ url: imageUrl, alt: product.name ?? "Garment" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);

  return (
    <>
      {product && (
        <ProductJsonLd
          id={id}
          name={product.name ?? "Garment"}
          description={product.description || product.longDescription || ""}
          category={product.category ?? ""}
          colour={product.colour ?? ""}
          sku={product.sku ?? ""}
          images={(product.images ?? []).slice(0, 4).map((img) =>
            img.startsWith("http") ? img : `${siteUrl}/api/images/signed?key=${encodeURIComponent(img)}`
          )}
          url={`${siteUrl}/products/${id}`}
        />
      )}
      {children}
    </>
  );
}
