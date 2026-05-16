import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { calculateOrderTotal, sumPayments, calculateOutstanding } from "@/lib/pricing";

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      hiddenProducts,
      totalCustomers,
      pendingPricing,
      unverified,
      lowStockProducts,
      newTodayOrders,
      activeOrders,
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
      Order.countDocuments({ signedAt: { $gte: startOfToday }, status: { $ne: "pending" } }),
      Order.find({ status: { $in: ["signed", "confirmed", "picked", "ready_to_ship", "shipped"] } })
        .select("items")
        .lean(),
    ]);

    const activeOrderIds = activeOrders.map((o) => (o as unknown as { _id: unknown })._id);
    const payments = activeOrderIds.length
      ? await Payment.find({ orderId: { $in: activeOrderIds } }).select("orderId amount refunded").lean()
      : [];
    const paymentsByOrder = new Map<string, { amount: number; refunded?: boolean }[]>();
    for (const p of payments) {
      const key = String((p as unknown as { orderId: unknown }).orderId);
      const arr = paymentsByOrder.get(key) ?? [];
      arr.push({ amount: (p as unknown as { amount: number }).amount, refunded: (p as unknown as { refunded?: boolean }).refunded });
      paymentsByOrder.set(key, arr);
    }
    let outstandingTotal = 0;
    let outstandingOrders = 0;
    for (const o of activeOrders) {
      const oid = String((o as unknown as { _id: unknown })._id);
      const items = (o as unknown as { items?: { pricePerPiece?: number; pricePerPack?: number; quantity: number }[] }).items ?? [];
      const total = calculateOrderTotal(items);
      const paid = sumPayments(paymentsByOrder.get(oid) ?? []);
      const out = calculateOutstanding(total, paid);
      if (out > 0) {
        outstandingTotal += out;
        outstandingOrders += 1;
      }
    }

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
      orders: {
        newToday: newTodayOrders,
        outstandingOrders,
        outstandingTotal: Math.round(outstandingTotal * 100) / 100,
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
