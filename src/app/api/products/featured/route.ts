import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({ featured: true })
      .select("name category colour images packSize stockCategory")
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    const list = products.map((p) => ({
      id: String(p._id),
      name: p.name,
      category: p.category,
      colour: p.colour,
      images: p.images ?? [],
      packSize: p.packSize,
      stockCategory: p.stockCategory,
    }));

    return NextResponse.json({ products: list });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch featured products" }, { status: 500 });
  }
}
