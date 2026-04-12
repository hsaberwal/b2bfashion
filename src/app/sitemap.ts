import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://claudia-c.com";
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = [];
  try {
    await connectDB();
    const products = await Product.find({ stockCategory: { $in: ["current", "forward"] } })
      .select("_id updatedAt")
      .lean();
    productPages = products.map((p) => ({
      url: `${baseUrl}/products/${String(p._id)}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt as Date) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error("Sitemap product fetch failed:", e);
  }

  return [...staticPages, ...productPages];
}
