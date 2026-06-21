import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { audit } from "@/lib/audit";
import { sendDispatchEmail } from "@/lib/adminNotifications";
import { getClientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  status: z.enum(["confirmed", "picked", "ready_to_ship", "shipped", "delivered", "cancelled"]),
  shippingCarrier: z.string().max(100).optional(),
  shippingTrackingNumber: z.string().max(200).optional(),
});

/** POST /api/admin/orders/[id]/status — advance fulfilment state. */
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
      return NextResponse.json({ error: "Invalid status", details: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { status, shippingCarrier, shippingTrackingNumber } = parsed.data;
    const now = new Date();

    // Only email the customer the first time the order is dispatched.
    const firstDispatch = status === "shipped" && !order.shippedAt;

    order.status = status;
    if (status === "picked" && !order.pickedAt) order.pickedAt = now;
    if (status === "ready_to_ship" && !order.readyAt) order.readyAt = now;
    if (status === "shipped" && !order.shippedAt) order.shippedAt = now;
    if (status === "delivered" && !order.deliveredAt) order.deliveredAt = now;
    if (shippingCarrier) order.shippingCarrier = shippingCarrier;
    if (shippingTrackingNumber) order.shippingTrackingNumber = shippingTrackingNumber;

    await order.save();

    // Fire-and-forget: send the customer their dispatch notification (the 2nd and
    // final order-lifecycle email). Never blocks or fails the status update.
    if (firstDispatch) {
      (async () => {
        const user = await User.findById(order.userId).select("email name").lean();
        const u = user as unknown as { email?: string; name?: string } | null;
        if (u?.email) {
          await sendDispatchEmail({
            to: u.email,
            customerName: u.name,
            orderShortCode: order._id.toString().slice(-8),
            carrier: order.shippingCarrier,
            trackingNumber: order.shippingTrackingNumber,
          });
        }
      })().catch((err) => console.error("dispatch email failed:", err));
    }

    await audit({
      action: "order_status_changed",
      userId: admin.id,
      targetType: "order",
      targetId: id,
      ip: getClientIp(request),
      details: { status, shippingCarrier, shippingTrackingNumber },
    });

    return NextResponse.json({ id: order._id.toString(), status: order.status });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("status update error:", e);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
