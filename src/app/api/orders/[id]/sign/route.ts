import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { encrypt } from "@/lib/encrypt";
import mongoose from "mongoose";
import { z } from "zod";

const deliverySnapshotSchema = z.object({
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postcode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  vatNumber: z.string().max(50).optional(),
  companyName: z.string().max(200).optional(),
});

const bodySchema = z.object({
  signatureDataUrl: z.string().max(2_000_000).refine(
    (s) => s.startsWith("data:") || s.startsWith("http"),
    "Must be a data URL or HTTP URL"
  ),
  deliverySnapshot: deliverySnapshotSchema,
  paymentOption: z.enum(["pay_now", "pay_deposit", "pay_later"]).optional(),
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

    // === STOCK RESERVATION ===
    // Atomically reserve stock for each line item. If any fails, roll back.
    const items = (order.items ?? []) as { productId: mongoose.Types.ObjectId; sku: string; quantity: number; packSize?: number }[];
    const reservedLines: { productId: mongoose.Types.ObjectId; packs: number }[] = [];

    async function rollback() {
      for (const r of reservedLines) {
        await Product.updateOne(
          { _id: r.productId },
          { $inc: { packsReserved: -r.packs } }
        ).catch(() => {});
      }
    }

    for (const item of items) {
      const packs = Math.floor(item.quantity / (item.packSize ?? 1));
      if (packs <= 0) continue;

      // Atomic conditional update: only succeeds if enough stock is available
      const result = await Product.updateOne(
        {
          _id: item.productId,
          $expr: {
            $gte: [
              { $subtract: [{ $ifNull: ["$packsInStock", 0] }, { $ifNull: ["$packsReserved", 0] }] },
              packs,
            ],
          },
        },
        { $inc: { packsReserved: packs } }
      );

      if (result.matchedCount === 0) {
        // Not enough stock — roll back any previously reserved lines and fail
        await rollback();
        const product = await Product.findById(item.productId).select("name packsInStock packsReserved");
        const available = Math.max(0, ((product?.packsInStock as number) ?? 0) - ((product?.packsReserved as number) ?? 0));
        return NextResponse.json(
          {
            error: `Not enough stock for ${item.sku}${product?.name ? ` (${product.name})` : ""}. Only ${available} pack${available !== 1 ? "s" : ""} available.`,
          },
          { status: 409 }
        );
      }

      reservedLines.push({ productId: item.productId, packs });
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
    // Always calculate deposit server-side — never trust client value
    const orderTotal = (order.items ?? []).reduce(
      (sum: number, item: { pricePerPack?: number; quantity: number; packSize?: number }) =>
        sum + (item.pricePerPack ?? 0) * (item.quantity / (item.packSize ?? 1)),
      0
    );
    order.depositAmount = Math.round(orderTotal * 0.1 * 100) / 100;
    order.signatureDataUrl = encrypt(signatureDataUrl);
    order.signedAt = new Date();
    order.status = "signed";
    try {
      await order.save();
    } catch (saveErr) {
      // Save failed after reserving stock — roll back reservations
      await rollback();
      throw saveErr;
    }

    await audit({
      action: "order_signed",
      userId: session.userId.toString(),
      targetType: "order",
      targetId: id,
      ip: getClientIp(request),
      details: { paymentOption, itemCount: order.items.length },
    });

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
