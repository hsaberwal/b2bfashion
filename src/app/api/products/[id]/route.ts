import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";
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
    const product = raw as Record<string, unknown>;
    const images = (product.images ?? []) as string[];

    // Check if user has pricing approval
    let pricingApproved = false;
    const token = await getSessionToken();
    if (token) {
      const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
      if (session) {
        const user = await User.findById(session.userId).select("pricingApproved role");
        pricingApproved = user?.role === "admin" || (user?.pricingApproved ?? false);
      }
    }

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
      sizeRatio: product.sizeRatio,
      attributes: product.attributes,
      images,
      packSize: product.packSize,
      pricePerItem: pricingApproved ? product.pricePerItem : undefined,
      compareAtPrice: pricingApproved ? product.compareAtPrice : undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
