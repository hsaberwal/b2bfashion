import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";

export type StockCategory = "previous" | "current" | "forward";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCategory = searchParams.get("stockCategory") as StockCategory | null;
    const category = searchParams.get("category");
    const colour = searchParams.get("colour");
    const forwardPassword = searchParams.get("forwardPassword");

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (stockCategory) {
      if (stockCategory === "forward") {
        const correct = process.env.FORWARD_STOCK_PASSWORD;
        if (!correct || forwardPassword !== correct) {
          return NextResponse.json(
            { error: "Forward stock is password protected. Provide forwardPassword." },
            { status: 403 }
          );
        }
      }
      filter.stockCategory = stockCategory;
    }
    if (category) filter.category = category;
    if (colour) filter.colour = colour;

    let pricingApproved = false;
    const token = await getSessionToken();
    if (token) {
      const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
      if (session) {
        const user = await User.findById(session.userId).select("pricingApproved");
        pricingApproved = user?.pricingApproved ?? false;
      }
    }

    const products = await Product.find(filter)
      .sort({ sku: 1 })
      .lean();
    const list = products.map((p) => ({
      id: String(p._id),
      sku: p.sku,
      barcode: p.barcode,
      styleNumber: p.styleNumber,
      name: p.name,
      description: p.description,
      category: p.category,
      stockCategory: p.stockCategory,
      colour: p.colour,
      attributes: p.attributes,
      images: p.images,
      packSize: p.packSize,
      pricePerItem: pricingApproved ? p.pricePerItem : undefined,
    }));
    return NextResponse.json({ products: list });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
