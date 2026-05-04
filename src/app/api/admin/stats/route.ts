import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { User } from "@/models/User";

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const [
      totalProducts,
      hiddenProducts,
      totalCustomers,
      pendingPricing,
      unverified,
      lowStockProducts,
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ disabled: true }),
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: { $ne: "admin" }, pricingApproved: { $ne: true } }),
      User.countDocuments({ emailVerified: { $ne: true } }),
      Product.find({
        disabled: { $ne: true },
        $expr: {
          $lt: [
            { $subtract: [{ $ifNull: ["$packsInStock", 0] }, { $ifNull: ["$packsReserved", 0] }] },
            5,
          ],
        },
      })
        .select("sku name images packsInStock packsReserved category")
        .sort({ packsInStock: 1 })
        .limit(8)
        .lean(),
    ]);

    return NextResponse.json({
      products: {
        total: totalProducts,
        hidden: hiddenProducts,
        active: totalProducts - hiddenProducts,
      },
      customers: {
        total: totalCustomers,
        pendingPricing,
        unverified,
      },
      lowStock: {
        count: lowStockProducts.length,
        items: lowStockProducts.map((p) => {
          const inStock = (p.packsInStock as number | undefined) ?? 0;
          const reserved = (p.packsReserved as number | undefined) ?? 0;
          return {
            id: String(p._id),
            sku: p.sku,
            name: p.name,
            image: Array.isArray(p.images) ? p.images[0] : undefined,
            category: p.category,
            available: Math.max(0, inStock - reserved),
          };
        }),
      },
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
