import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { createRefund, isStripeConfigured } from "@/lib/stripe";
import { sumPayments } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({ itemId: z.string().min(1) });

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * POST /api/admin/orders/[id]/refund-item — issue the Stripe refund for a
 * previously-removed pack that was marked "refund owed". Only valid for orders
 * paid via Stripe; offline-paid orders are settled outside the app.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    await connectDB();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const item = order.items.id(parsed.data.itemId);
    if (!item) return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    if (!item.cancelled || item.creditType !== "refund" || item.refundStatus !== "owed") {
      return NextResponse.json({ error: "This pack is not awaiting a refund." }, { status: 400 });
    }

    if (!isStripeConfigured() || !order.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No Stripe payment to refund against. Settle this credit outside the app." },
        { status: 400 }
      );
    }

    // Never refund more than what's actually been paid and not yet refunded.
    const payments = (await Payment.find({ orderId: order._id }).select("amount refunded").lean()) as unknown as { amount: number; refunded?: boolean }[];
    const paid = sumPayments(payments);
    const refundable = round(paid - (order.refundedTotal ?? 0));
    const amount = Math.min(item.creditAmount ?? 0, refundable);
    if (amount <= 0) {
      return NextResponse.json({ error: "Nothing left to refund on this order." }, { status: 400 });
    }

    let refundId: string;
    try {
      const refund = await createRefund(order.stripePaymentIntentId, amount);
      refundId = refund.id;
    } catch (err) {
      console.error("Stripe refund failed:", err);
      return NextResponse.json({ error: "Stripe refund failed. Please try again or refund in Stripe directly." }, { status: 502 });
    }

    item.refundStatus = "refunded";
    item.stripeRefundId = refundId;
    order.refundedTotal = round((order.refundedTotal ?? 0) + amount);
    await order.save();

    await audit({
      action: "order_item_refunded",
      userId: admin.id,
      targetType: "order",
      targetId: id,
      ip: getClientIp(request),
      details: { itemId: parsed.data.itemId, sku: item.sku, amount, refundId },
    });

    return NextResponse.json({ ok: true, amount, refundId });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("refund-item error:", e);
    return NextResponse.json({ error: "Failed to issue refund" }, { status: 500 });
  }
}
