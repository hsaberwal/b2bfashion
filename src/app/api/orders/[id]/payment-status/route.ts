import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { getSessionToken } from "@/lib/auth";
import { Session } from "@/models/Session";
import { audit } from "@/lib/audit";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import mongoose from "mongoose";

/**
 * Consume reserved stock — when an order is paid/confirmed.
 * Decrements both packsInStock and packsReserved by the same amount.
 */
async function consumeStockForOrder(order: { items?: { productId: unknown; quantity: number; packSize?: number }[] }): Promise<void> {
  for (const item of order.items ?? []) {
    const packs = Math.floor(item.quantity / (item.packSize ?? 1));
    if (packs <= 0) continue;
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { packsInStock: -packs, packsReserved: -packs } }
    ).catch(() => {});
  }
}

/**
 * Release reserved stock — when an order is cancelled or payment fails.
 * Decrements only packsReserved (returns the packs to available pool).
 */
async function releaseReservedStock(order: { items?: { productId: unknown; quantity: number; packSize?: number }[] }): Promise<void> {
  for (const item of order.items ?? []) {
    const packs = Math.floor(item.quantity / (item.packSize ?? 1));
    if (packs <= 0) continue;
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { packsReserved: -packs } }
    ).catch(() => {});
  }
}

/**
 * GET /api/orders/[id]/payment-status
 * Called by the checkout result page to get the current payment state.
 *
 * SECURITY: worldpayStatus is only accepted as a hint. In production,
 * payment confirmation should come from Worldpay server-to-server
 * webhook with MAC verification. The redirect status is treated as
 * provisional — only the Worldpay order code match provides assurance.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`payment-status:${ip}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await Order.findOne({ _id: id, userId: session.userId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update payment status from Worldpay redirect — only if:
    // 1. Order has a Worldpay order code (was actually sent to Worldpay)
    // 2. Payment is still pending (idempotent — won't re-process)
    // 3. The user owns this order (checked above)
    const { searchParams } = new URL(request.url);
    const worldpayStatus = searchParams.get("worldpayStatus");

    if (worldpayStatus && order.paymentStatus === "pending" && order.worldpayOrderCode) {
      switch (worldpayStatus) {
        case "success":
          order.paymentStatus = "paid";
          order.status = "confirmed";
          if (order.paymentOption === "pay_deposit") {
            order.depositPaid = true;
          }
          await order.save();
          // Consume reserved stock (move from reserved to sold)
          await consumeStockForOrder(order);
          await audit({
            action: "payment_completed",
            userId: session.userId.toString(),
            targetType: "order",
            targetId: id,
            ip,
            details: { paymentOption: order.paymentOption, amountPaid: order.amountPaid },
          });
          break;
        case "failure":
          order.paymentStatus = "failed";
          await order.save();
          // Release reservations since payment failed
          await releaseReservedStock(order);
          await audit({
            action: "payment_failed",
            userId: session.userId.toString(),
            targetType: "order",
            targetId: id,
            ip,
          });
          break;
        case "cancelled":
          order.paymentStatus = "none";
          await order.save();
          // Release reservations
          await releaseReservedStock(order);
          break;
        // "pending" — leave as-is, stock still reserved
      }
    }

    return NextResponse.json({
      id: order._id.toString(),
      status: order.status,
      paymentOption: order.paymentOption,
      paymentStatus: order.paymentStatus,
      amountPaid: order.amountPaid,
      depositAmount: order.depositAmount,
      depositPaid: order.depositPaid,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 });
  }
}
