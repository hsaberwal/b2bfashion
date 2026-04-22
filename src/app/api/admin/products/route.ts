import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/requireAdmin";
import { PRODUCT_CATEGORIES } from "@/lib/types";
import { z } from "zod";

function mapProduct(p: Record<string, unknown>) {
  return {
    id: String(p._id),
    sku: p.sku,
    brandCode: p.brandCode,
    brand: p.brand,
    season: p.season,
    name: p.name,
    description: p.description,
    longDescription: p.longDescription,
    materials: p.materials,
    careGuide: p.careGuide,
    category: p.category,
    stockCategory: p.stockCategory,
    colour: p.colour,
    sizes: p.sizes,
    sizeRatio: p.sizeRatio,
    attributes: p.attributes,
    images: p.images,
    packSize: p.packSize,
    minPacks: p.minPacks,
    pricePerPiece: p.pricePerPiece ?? p.pricePerPack,
    packsInStock: p.packsInStock,
    packsReserved: p.packsReserved,
    disabled: p.disabled,
  };
}

const createProductSchema = z.object({
  sku: z.string().min(1).trim(),
  brandCode: z.string().optional(),
  brand: z.string().optional(),
  season: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  materials: z.string().optional(),
  careGuide: z.string().optional(),
  category: z.enum([...PRODUCT_CATEGORIES] as [string, ...string[]]),
  stockCategory: z.enum(["previous", "current", "forward"]).optional(),
  colour: z.string().min(1),
  sizes: z.array(z.string()).optional(),
  sizeRatio: z.array(z.number().int().min(0)).optional(),
  attributes: z.record(z.string()).optional(),
  images: z.array(z.string().min(1)).optional(),
  packSize: z.number().int().min(1),
  minPacks: z.number().int().min(1).optional(),
  pricePerPiece: z.number().optional(),
  packsInStock: z.number().int().min(0).optional(),
  disabled: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();
    const products = await Product.find({}).sort({ sku: 1 }).limit(5000).lean();
    return NextResponse.json({
      products: products.map((p) => mapProduct(p)),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const existing = await Product.findOne({ sku: parsed.data.sku });
    if (existing) {
      return NextResponse.json({ error: "Product with this SKU already exists" }, { status: 409 });
    }
    const product = await Product.create({
      ...parsed.data,
      stockCategory: parsed.data.stockCategory ?? "current",
      sizes: parsed.data.sizes?.length ? parsed.data.sizes : undefined,
    });
    return NextResponse.json({
      id: product._id.toString(),
      sku: product.sku,
      name: product.name,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
