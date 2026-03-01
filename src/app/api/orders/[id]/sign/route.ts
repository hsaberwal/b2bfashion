import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";
import mongoose from "mongoose";
import { z } from "zod";

const deliverySnapshotSchema = z.object({
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  country: z.string().min(1),
  vatNumber: z.string().optional(),
  companyName: z.string().optional(),
});

const bodySchema = z.object({
  signatureDataUrl: z.string().url().or(z.string().startsWith("data:")),
  deliverySnapshot: deliverySnapshotSchema,
  paymentOption: z.enum(["pay_now", "pay_later"]).optional(),
  depositAmount: z.number().min(0).optional(),
});

export async function POST(
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
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Delivery details and signature required", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { signatureDataUrl, deliverySnapshot, paymentOption, depositAmount } = parsed.data;

    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const order = await Order.findOne({ _id: id, userId: session.userId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ error: "Order already signed or cancelled" }, { status: 400 });
    }

    order.deliverySnapshot = {
      addressLine1: deliverySnapshot.addressLine1,
      addressLine2: deliverySnapshot.addressLine2 ?? "",
      city: deliverySnapshot.city,
      postcode: deliverySnapshot.postcode,
      country: deliverySnapshot.country,
      vatNumber: deliverySnapshot.vatNumber ?? "",
      companyName: deliverySnapshot.companyName ?? "",
    };
    if (paymentOption) order.paymentOption = paymentOption;
    if (depositAmount != null) order.depositAmount = depositAmount;
    order.signatureDataUrl = signatureDataUrl;
    order.signedAt = new Date();
    order.status = "signed";
    await order.save();

    const user = await User.findById(session.userId);
    if (user) {
      user.deliveryAddress = {
        addressLine1: deliverySnapshot.addressLine1,
        addressLine2: deliverySnapshot.addressLine2 ?? "",
        city: deliverySnapshot.city,
        postcode: deliverySnapshot.postcode,
        country: deliverySnapshot.country,
      };
      if (deliverySnapshot.vatNumber !== undefined) user.vatNumber = deliverySnapshot.vatNumber;
      if (deliverySnapshot.companyName !== undefined) user.companyName = deliverySnapshot.companyName;
      await user.save();
    }

    return NextResponse.json({
      id: order._id.toString(),
      status: order.status,
      signedAt: order.signedAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to sign order" }, { status: 500 });
  }
}
