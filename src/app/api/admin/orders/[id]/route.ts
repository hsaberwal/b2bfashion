import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { calculateOrderTotal, sumPayments, sumCredited, calculateOutstanding } from "@/lib/pricing";

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
      _id: unknown;
      productId: mongoose.Types.ObjectId;
      sku: string;
      quantity: number;
      pricePerPiece?: number;
      packSize?: number;
      size?: string;
      cancelled?: boolean;
      cancelledAt?: Date;
      cancelledReason?: string;
      creditAmount?: number;
      creditType?: "balance" | "refund";
      refundStatus?: "none" | "owed" | "refunded";
    }[];

    const [user, payments, products] = await Promise.all([
      User.findById(userId).select("email name companyName vatNumber deliveryAddress stripeCustomerId creditBalance").lean(),
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
    const refundedTotal = (order as unknown as { refundedTotal?: number }).refundedTotal ?? 0;
    const paid = Math.round((sumPayments(paymentList) - refundedTotal) * 100) / 100;
    const outstanding = calculateOutstanding(total, paid);
    const credited = sumCredited(items as { cancelled?: boolean; creditAmount?: number; quantity: number }[]);
    const refundOwed = Math.round(
      items.reduce((s, i) => (i.cancelled && i.creditType === "refund" && i.refundStatus === "owed" ? s + (i.creditAmount ?? 0) : s), 0) * 100,
    ) / 100;
    const balanceDue = Math.max(0, Math.round((total - (paid - credited)) * 100) / 100);

    const richItems = items.map((i) => {
      const product = productById.get(String(i.productId));
      const packs = product?.packSize ? Math.floor(i.quantity / product.packSize) : null;
      return {
        itemId: String(i._id),
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
        cancelled: i.cancelled ?? false,
        cancelledAt: i.cancelledAt,
        cancelledReason: i.cancelledReason,
        creditAmount: i.creditAmount ?? 0,
        creditType: i.creditType ?? null,
        refundStatus: i.refundStatus ?? "none",
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
      refundedTotal?: number;
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
      refundedTotal,
      credited,
      refundOwed,
      balanceDue,
      payments: paymentList,
      customer: user ? {
        id: String((user as unknown as { _id: unknown })._id),
        email: (user as unknown as { email: string }).email,
        name: (user as unknown as { name?: string }).name,
        companyName: (user as unknown as { companyName?: string }).companyName,
        vatNumber: (user as unknown as { vatNumber?: string }).vatNumber,
        stripeCustomerId: (user as unknown as { stripeCustomerId?: string }).stripeCustomerId,
        creditBalance: (user as unknown as { creditBalance?: number }).creditBalance ?? 0,
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
