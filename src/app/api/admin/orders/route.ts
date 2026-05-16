import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { calculateOrderTotal, sumPayments, calculateOutstanding } from "@/lib/pricing";
import type { FilterQuery } from "mongoose";

/**
 * GET /api/admin/orders
 *
 * Query params (all optional):
 *   status        — comma-separated list to include (e.g. "signed,confirmed,picked")
 *   paymentStatus — comma-separated list (e.g. "paid,pending,none")
 *   paymentOption — comma-separated list (e.g. "pay_now,pay_deposit,pay_later")
 *   userId        — restrict to one customer
 *   from, to      — ISO date range (createdAt)
 *   q             — free-text search across customer email/name/company/SKU
 *   includeCart   — "true" to include status=pending (otherwise filtered out)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const paymentStatusParam = searchParams.get("paymentStatus");
    const paymentOptionParam = searchParams.get("paymentOption");
    const userIdParam = searchParams.get("userId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const q = searchParams.get("q")?.trim();
    const includeCart = searchParams.get("includeCart") === "true";

    const filter: FilterQuery<Record<string, unknown>> = {};
    if (statusParam) {
      filter.status = { $in: statusParam.split(",").map((s) => s.trim()).filter(Boolean) };
    } else if (!includeCart) {
      filter.status = { $ne: "pending" };
    }
    if (paymentStatusParam) {
      filter.paymentStatus = { $in: paymentStatusParam.split(",").map((s) => s.trim()).filter(Boolean) };
    }
    if (paymentOptionParam) {
      filter.paymentOption = { $in: paymentOptionParam.split(",").map((s) => s.trim()).filter(Boolean) };
    }
    if (userIdParam) filter.userId = userIdParam;
    if (fromParam || toParam) {
      filter.createdAt = {} as Record<string, Date>;
      if (fromParam) (filter.createdAt as Record<string, Date>).$gte = new Date(fromParam);
      if (toParam) (filter.createdAt as Record<string, Date>).$lte = new Date(toParam);
    }

    let userIds: string[] | null = null;
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchedUsers = await User.find({
        $or: [{ email: re }, { name: re }, { companyName: re }],
      })
        .select("_id")
        .lean();
      userIds = matchedUsers.map((u) => String(u._id));
      const skuOr = [{ "items.sku": re }];
      if (userIds.length > 0) {
        filter.$or = [{ userId: { $in: userIds } }, ...skuOr];
      } else {
        filter.$or = skuOr;
      }
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const orderIds = orders.map((o) => o._id);
    const userIdSet = Array.from(new Set(orders.map((o) => String((o as unknown as { userId: unknown }).userId))));
    const [payments, users] = await Promise.all([
      Payment.find({ orderId: { $in: orderIds } }).lean(),
      User.find({ _id: { $in: userIdSet } })
        .select("email name companyName")
        .lean(),
    ]);

    const paymentsByOrder = new Map<string, { amount: number; refunded?: boolean }[]>();
    for (const p of payments) {
      const key = String((p as unknown as { orderId: unknown }).orderId);
      const arr = paymentsByOrder.get(key) ?? [];
      arr.push({ amount: (p as unknown as { amount: number }).amount, refunded: (p as unknown as { refunded?: boolean }).refunded });
      paymentsByOrder.set(key, arr);
    }
    const usersById = new Map<string, { email: string; name?: string; companyName?: string }>();
    for (const u of users) {
      usersById.set(String((u as unknown as { _id: unknown })._id), u as unknown as { email: string; name?: string; companyName?: string });
    }

    const list = orders.map((o) => {
      const oid = String((o as unknown as { _id: unknown })._id);
      const u = usersById.get(String((o as unknown as { userId: unknown }).userId));
      const items = (o as unknown as { items?: { pricePerPiece?: number; pricePerPack?: number; quantity: number }[] }).items ?? [];
      const total = calculateOrderTotal(items);
      const paid = sumPayments(paymentsByOrder.get(oid) ?? []);
      const outstanding = calculateOutstanding(total, paid);
      return {
        id: oid,
        shortCode: oid.slice(-8),
        createdAt: (o as unknown as { createdAt: Date }).createdAt,
        signedAt: (o as unknown as { signedAt?: Date }).signedAt,
        shippedAt: (o as unknown as { shippedAt?: Date }).shippedAt,
        status: (o as unknown as { status: string }).status,
        paymentStatus: (o as unknown as { paymentStatus: string }).paymentStatus,
        paymentOption: (o as unknown as { paymentOption: string }).paymentOption,
        depositAmount: (o as unknown as { depositAmount?: number }).depositAmount,
        depositPaid: (o as unknown as { depositPaid?: boolean }).depositPaid,
        itemCount: items.length,
        unitCount: items.reduce((s, i) => s + i.quantity, 0),
        total,
        paid,
        outstanding,
        customer: u ? { id: String((u as unknown as { _id?: unknown })._id ?? ""), email: u.email, name: u.name, companyName: u.companyName } : null,
      };
    });

    return NextResponse.json({ orders: list });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("admin orders list error:", e);
    return NextResponse.json({ error: "Failed to list orders" }, { status: 500 });
  }
}
