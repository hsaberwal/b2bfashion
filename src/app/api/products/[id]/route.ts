import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import mongoose from "mongoose";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }
    await connectDB();
    const raw = await Product.findById(id).lean();
    if (!raw || Array.isArray(raw)) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const product = raw as unknown as { _id: unknown; sku: string; barcode?: string; styleNumber?: string; name: string; description?: string; category: string; stockCategory: string; colour: string; attributes: Record<string, string>; images: string[]; packSize: number; pricePerItem?: number };
    return NextResponse.json({
      id: String(product._id),
      sku: product.sku,
      barcode: product.barcode,
      styleNumber: product.styleNumber,
      name: product.name,
      description: product.description,
      category: product.category,
      stockCategory: product.stockCategory,
      colour: product.colour,
      attributes: product.attributes,
      images: product.images,
      packSize: product.packSize,
      pricePerItem: product.pricePerItem,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
