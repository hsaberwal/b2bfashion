import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import mongoose from "mongoose";
import { resolveImageUrls } from "@/lib/imageService";

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
    const product = raw as Record<string, unknown>;
    const images = (product.images ?? []) as string[];
    const imagesResolved = await resolveImageUrls(images, 1200);
    return NextResponse.json({
      id: String(product._id),
      sku: product.sku,
      productCode: product.productCode,
      barcode: product.barcode,
      styleNumber: product.styleNumber,
      name: product.name,
      description: product.description,
      longDescription: product.longDescription,
      materials: product.materials,
      careGuide: product.careGuide,
      category: product.category,
      stockCategory: product.stockCategory,
      colour: product.colour,
      colours: product.colours,
      sizes: product.sizes,
      attributes: product.attributes,
      images: imagesResolved,
      packSize: product.packSize,
      pricePerItem: product.pricePerItem,
      compareAtPrice: product.compareAtPrice,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
