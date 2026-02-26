import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/requireAdmin";
import { PRODUCT_CATEGORIES } from "@/lib/types";
import mongoose from "mongoose";
import { z } from "zod";

const updateProductSchema = z.object({
  sku: z.string().min(1).trim().optional(),
  productCode: z.string().optional(),
  barcode: z.string().optional(),
  styleNumber: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  materials: z.string().optional(),
  careGuide: z.string().optional(),
  category: z.enum([...PRODUCT_CATEGORIES] as [string, ...string[]]).optional(),
  stockCategory: z.enum(["previous", "current", "forward"]).optional(),
  colour: z.string().min(1).optional(),
  colours: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  attributes: z.record(z.string()).optional(),
  images: z.array(z.string().min(1)).optional(),
  packSize: z.number().int().min(1).optional(),
  pricePerItem: z.number().optional(),
  compareAtPrice: z.number().optional(),
});

function mapProduct(p: Record<string, unknown>) {
  return {
    id: String(p._id),
    sku: p.sku,
    productCode: p.productCode,
    barcode: p.barcode,
    styleNumber: p.styleNumber,
    name: p.name,
    description: p.description,
    longDescription: p.longDescription,
    materials: p.materials,
    careGuide: p.careGuide,
    category: p.category,
    stockCategory: p.stockCategory,
    colour: p.colour,
    colours: p.colours,
    sizes: p.sizes,
    attributes: p.attributes,
    images: p.images,
    packSize: p.packSize,
    pricePerItem: p.pricePerItem,
    compareAtPrice: p.compareAtPrice,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }
    await connectDB();
    const product = await Product.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(mapProduct(product as Record<string, unknown>));
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (parsed.data.sku && parsed.data.sku !== product.sku) {
      const existing = await Product.findOne({ sku: parsed.data.sku });
      if (existing) {
        return NextResponse.json({ error: "Another product with this SKU already exists" }, { status: 409 });
      }
    }
    Object.assign(product, parsed.data);
    await product.save();
    return NextResponse.json(mapProduct(product.toObject() as Record<string, unknown>));
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }
    await connectDB();
    const result = await Product.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Product deleted" });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
