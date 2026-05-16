import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { calculateOrderTotal, sumPayments, calculateOutstanding } from "@/lib/pricing";

const bodySchema = z.object({
  amount: z.number().positive().max(1_000_000),
  method: z.enum(["cash", "bank_transfer", "cheque", "stripe", "other"]),
  reference: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
});

/**
 * POST /api/admin/orders/[id]/payments
 *
 * Record a manual payment against an order. Used by the admin to log
 * cash / bank transfer / cheque payments that close out a customer's
 * outstanding balance (often after a pay_later invoice or to top up a
 * pay_deposit order).
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
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment", details: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const payment = await Payment.create({
      orderId: order._id,
      userId: order.userId,
      amount: parsed.data.amount,
      currency: "GBP",
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      recordedBy: new mongoose.Types.ObjectId(admin.id),
    });

    // Recalculate paid + outstanding and flip flags on the order.
    const items = (order.items ?? []) as unknown as { pricePerPiece?: number; pricePerPack?: number; quantity: number }[];
    const total = calculateOrderTotal(items);
    const allPayments = await Payment.find({ orderId: order._id }).select("amount refunded").lean();
    const paid = sumPayments(allPayments as unknown as { amount: number; refunded?: boolean }[]);
    const outstanding = calculateOutstanding(total, paid);

    order.amountPaid = paid;
    if (outstanding <= 0) {
      order.paymentStatus = "paid";
      if (order.paymentOption === "pay_deposit") order.depositPaid = true;
    } else if (paid > 0 && order.paymentOption === "pay_deposit" && paid >= (order.depositAmount ?? 0)) {
      order.depositPaid = true;
    }
    await order.save();

    await audit({
      action: "payment_recorded",
      userId: admin.id,
      targetType: "order",
      targetId: id,
      ip: getClientIp(request),
      details: { amount: parsed.data.amount, method: parsed.data.method, reference: parsed.data.reference },
    });

    return NextResponse.json({
      id: String(payment._id),
      orderId: String(order._id),
      paid,
      outstanding,
      paymentStatus: order.paymentStatus,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("record payment error:", e);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
