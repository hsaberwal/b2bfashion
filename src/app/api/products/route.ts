import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";

export type StockCategory = "previous" | "current" | "forward";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCategoryParam = searchParams.get("stockCategory");
    const stockCategory = stockCategoryParam === "all" || !stockCategoryParam ? null : (stockCategoryParam as StockCategory);
    const category = searchParams.get("category");
    const colour = searchParams.get("colour");
    const search = searchParams.get("search")?.trim() || searchParams.get("q")?.trim();

    await connectDB();

    let pricingApproved = false;
    let canViewForward = false;
    let canViewCurrent = true;
    let canViewPrevious = true;
    const token = await getSessionToken();
    if (token) {
      const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
      if (session) {
        const user = await User.findById(session.userId).select("pricingApproved role canViewForwardStock canViewCurrentStock canViewPreviousStock");
        pricingApproved = user?.pricingApproved ?? false;
        canViewForward = user?.role === "admin" || user?.canViewForwardStock === true;
        canViewCurrent = user?.role === "admin" || (user?.canViewCurrentStock ?? true);
        canViewPrevious = user?.role === "admin" || (user?.canViewPreviousStock ?? true);
      }
    }

    const filter: Record<string, unknown> = {};
    if (stockCategory === "forward") {
      if (!canViewForward) {
        return NextResponse.json(
          { error: "You do not have permission to view forward stock." },
          { status: 403 }
        );
      }
      filter.stockCategory = "forward";
    } else if (stockCategory === "current") {
      if (!canViewCurrent) {
        return NextResponse.json(
          { error: "You do not have permission to view current stock." },
          { status: 403 }
        );
      }
      filter.stockCategory = "current";
    } else if (stockCategory === "previous") {
      if (!canViewPrevious) {
        return NextResponse.json(
          { error: "You do not have permission to view previous stock." },
          { status: 403 }
        );
      }
      filter.stockCategory = "previous";
    } else if (stockCategory === null) {
      // "All stock": include only permitted categories
      const allowed: string[] = [];
      if (canViewPrevious) allowed.push("previous");
      if (canViewCurrent) allowed.push("current");
      if (canViewForward) allowed.push("forward");
      if (allowed.length === 0) filter.stockCategory = { $exists: false };
      else if (allowed.length < 3) filter.stockCategory = { $in: allowed };
    }
    if (category) filter.category = category;
    if (colour) filter.colour = colour;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { sku: re },
        { name: re },
        { styleNumber: re },
        { barcode: re },
      ];
    }

    const products = await Product.find(filter)
      .sort({ sku: 1 })
      .lean();
    const list = products.map((p) => {
      const images = (p.images ?? []) as string[];
      return {
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
        images,
        packSize: p.packSize,
        pricePerItem: pricingApproved ? p.pricePerItem : undefined,
      };
    });
    return NextResponse.json({ products: list });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
