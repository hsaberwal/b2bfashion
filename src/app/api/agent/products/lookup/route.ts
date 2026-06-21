import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";

/**
 * GET /api/agent/products/lookup?code= — resolve a scanned/typed code to a pack.
 * Matches the product's `barcode` OR its `sku`, so it works whether the label
 * carries a dedicated barcode or just the SKU printed as a barcode.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAgent();
    const code = (new URL(request.url).searchParams.get("code") ?? "").trim();
    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });
    await connectDB();
    const product = await Product.findOne({
      disabled: { $ne: true },
      $or: [{ barcode: code }, { sku: code }],
    })
      .select("sku name colour packSize minPacks pricePerPiece pricePerPack packsInStock packsReserved images")
      .lean();
    if (!product) return NextResponse.json({ error: `No product matches “${code}”` }, { status: 404 });

    const p = product as unknown as { _id: unknown; sku: string; name: string; colour?: string; packSize: number; minPacks?: number; pricePerPiece?: number; pricePerPack?: number; packsInStock?: number; packsReserved?: number; images?: string[] };
    return NextResponse.json({
      product: {
        id: String(p._id),
        sku: p.sku,
        name: p.name,
        colour: p.colour,
        packSize: p.packSize,
        minPacks: p.minPacks ?? 1,
        pricePerPiece: p.pricePerPiece ?? p.pricePerPack,
        available: Math.max(0, (p.packsInStock ?? 0) - (p.packsReserved ?? 0)),
        image: p.images?.[0],
      },
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: agents only" }, { status: 403 });
    console.error("product lookup error:", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
