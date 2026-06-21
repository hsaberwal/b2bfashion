import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";

/** GET /api/agent/products?search= — product search for the agent order builder (includes prices). */
export async function GET(request: NextRequest) {
  try {
    await requireAgent();
    await connectDB();
    const search = (request.nextUrl.searchParams.get("search") ?? "").trim();
    const filter: Record<string, unknown> = { disabled: { $ne: true } };
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ sku: re }, { name: re }, { colour: re }];
    }
    const products = await Product.find(filter)
      .select("sku name colour packSize minPacks pricePerPiece pricePerPack packsInStock packsReserved images")
      .sort({ name: 1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      products: products.map((p) => {
        const inStock = (p.packsInStock as number) ?? 0;
        const reserved = (p.packsReserved as number) ?? 0;
        return {
          id: String((p as unknown as { _id: unknown })._id),
          sku: p.sku,
          name: p.name,
          colour: p.colour,
          packSize: p.packSize,
          minPacks: p.minPacks ?? 1,
          pricePerPiece: (p.pricePerPiece as number) ?? (p as unknown as { pricePerPack?: number }).pricePerPack,
          available: Math.max(0, inStock - reserved),
          image: (p.images as string[] | undefined)?.[0],
        };
      }),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: agents only" }, { status: 403 });
    console.error("agent products error:", e);
    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}
