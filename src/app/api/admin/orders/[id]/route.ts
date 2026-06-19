import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { calculateOrderTotal, sumPayments, calculateOutstanding } from "@/lib/pricing";

/** GET /api/admin/orders/[id] — full order + customer + payments + product detail. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }
    await connectDB();
    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const userId = (order as unknown as { userId: unknown }).userId;
    const items = ((order as unknown as { items?: unknown[] }).items ?? []) as unknown as {
      productId: mongoose.Types.ObjectId;
      sku: string;
      quantity: number;
      pricePerPiece?: number;
      packSize?: number;
      size?: string;
    }[];

    const [user, payments, products] = await Promise.all([
      User.findById(userId).select("email name companyName vatNumber deliveryAddress stripeCustomerId").lean(),
      Payment.find({ orderId: id }).sort({ createdAt: 1 }).lean(),
      Product.find({ _id: { $in: items.map((i) => i.productId) } })
        .select("sku name colour category sizes sizeRatio images packSize")
        .lean(),
    ]);

    const productById = new Map<string, {
      sku: string;
      name: string;
      colour?: string;
      category?: string;
      sizes?: string[];
      sizeRatio?: number[];
      images?: string[];
      packSize?: number;
    }>();
    for (const p of products) {
      productById.set(String((p as unknown as { _id: unknown })._id), p as unknown as {
        sku: string;
        name: string;
        colour?: string;
        category?: string;
        sizes?: string[];
        sizeRatio?: number[];
        images?: string[];
        packSize?: number;
      });
    }

    const total = calculateOrderTotal(items);
    const paymentList = (payments as unknown as {
      _id: unknown;
      amount: number;
      method: string;
      reference?: string;
      note?: string;
      refunded?: boolean;
      createdAt: Date;
    }[]).map((p) => ({
      id: String(p._id),
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      note: p.note,
      refunded: p.refunded ?? false,
      createdAt: p.createdAt,
    }));
    const paid = sumPayments(paymentList);
    const outstanding = calculateOutstanding(total, paid);

    const richItems = items.map((i) => {
      const product = productById.get(String(i.productId));
      const packs = product?.packSize ? Math.floor(i.quantity / product.packSize) : null;
      return {
        productId: String(i.productId),
        sku: i.sku,
        productName: product?.name ?? i.sku,
        colour: product?.colour,
        category: product?.category,
        sizes: product?.sizes,
        sizeRatio: product?.sizeRatio,
        image: product?.images?.[0],
        size: i.size,
        quantity: i.quantity,
        packSize: i.packSize ?? product?.packSize ?? 1,
        packs,
        pricePerPiece: i.pricePerPiece,
        lineTotal: (i.pricePerPiece ?? 0) * i.quantity,
      };
    });

    const o = order as unknown as {
      _id: unknown;
      createdAt: Date;
      signedAt?: Date;
      pickedAt?: Date;
      readyAt?: Date;
      shippedAt?: Date;
      deliveredAt?: Date;
      status: string;
      paymentStatus: string;
      paymentOption: string;
      depositAmount?: number;
      depositPaid?: boolean;
      amountPaid?: number;
      stripeSessionId?: string;
      stripePaymentIntentId?: string;
      shippingCarrier?: string;
      shippingTrackingNumber?: string;
      deliverySnapshot?: Record<string, string>;
      specialInstructions?: string;
    };

    return NextResponse.json({
      id: String(o._id),
      shortCode: String(o._id).slice(-8),
      createdAt: o.createdAt,
      signedAt: o.signedAt,
      pickedAt: o.pickedAt,
      readyAt: o.readyAt,
      shippedAt: o.shippedAt,
      deliveredAt: o.deliveredAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentOption: o.paymentOption,
      depositAmount: o.depositAmount,
      depositPaid: o.depositPaid,
      amountPaid: o.amountPaid,
      stripeSessionId: o.stripeSessionId,
      stripePaymentIntentId: o.stripePaymentIntentId,
      shippingCarrier: o.shippingCarrier,
      shippingTrackingNumber: o.shippingTrackingNumber,
      deliverySnapshot: o.deliverySnapshot ?? null,
      specialInstructions: o.specialInstructions ?? "",
      items: richItems,
      total,
      paid,
      outstanding,
      payments: paymentList,
      customer: user ? {
        id: String((user as unknown as { _id: unknown })._id),
        email: (user as unknown as { email: string }).email,
        name: (user as unknown as { name?: string }).name,
        companyName: (user as unknown as { companyName?: string }).companyName,
        vatNumber: (user as unknown as { vatNumber?: string }).vatNumber,
        stripeCustomerId: (user as unknown as { stripeCustomerId?: string }).stripeCustomerId,
      } : null,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("admin order detail error:", e);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}
