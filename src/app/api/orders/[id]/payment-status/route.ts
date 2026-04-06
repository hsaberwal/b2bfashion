import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { getSessionToken } from "@/lib/auth";
import { Session } from "@/models/Session";
import mongoose from "mongoose";

/**
 * GET /api/orders/[id]/payment-status
 * Called by the checkout result page to get the current payment state.
 * Also accepts ?worldpayStatus=success|failure|pending|cancelled to update.
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

    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await Order.findOne({ _id: id, userId: session.userId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update payment status from Worldpay redirect
    const { searchParams } = new URL(request.url);
    const worldpayStatus = searchParams.get("worldpayStatus");

    if (worldpayStatus && order.paymentStatus === "pending") {
      switch (worldpayStatus) {
        case "success":
          order.paymentStatus = "paid";
          order.status = "confirmed";
          if (order.paymentOption === "pay_deposit") {
            order.depositPaid = true;
          }
          await order.save();
          break;
        case "failure":
          order.paymentStatus = "failed";
          await order.save();
          break;
        case "cancelled":
          order.paymentStatus = "none";
          await order.save();
          break;
        // "pending" — leave as-is, Worldpay is still processing
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
      worldpayOrderCode: order.worldpayOrderCode,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 });
  }
}
