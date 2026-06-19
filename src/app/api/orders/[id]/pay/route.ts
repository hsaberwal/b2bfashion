import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { getEnabledPaymentOptions } from "@/lib/paymentOptionsServer";
import { isPaymentOptionEnabled } from "@/lib/paymentOptions";
import { calculateOrderTotal, calculateDeposit } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import mongoose from "mongoose";
import { z } from "zod";

const bodySchema = z.object({
  paymentOption: z.enum(["pay_now", "pay_deposit", "pay_later"]),
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
      return NextResponse.json({ error: "Invalid payment option" }, { status: 400 });
    }
    const { paymentOption } = parsed.data;

    // Enforce the admin-configured set server-side — never trust the client to
    // only send enabled options.
    const enabledOptions = await getEnabledPaymentOptions();
    if (!isPaymentOptionEnabled(enabledOptions, paymentOption)) {
      return NextResponse.json({ error: "That payment option is not available." }, { status: 400 });
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
    if (order.status !== "signed") {
      return NextResponse.json({ error: "Order must be signed before payment" }, { status: 400 });
    }
    // Prevent double payment initiation
    if (order.paymentStatus === "pending") {
      return NextResponse.json({ error: "Payment has already been initiated for this order. Please complete the existing payment or wait for it to expire." }, { status: 409 });
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "This order has already been paid." }, { status: 409 });
    }

    // Calculate order total. Price is stored per-piece; quantity is total units.
    const orderTotal = calculateOrderTotal(
      (order.items ?? []) as { pricePerPiece?: number; pricePerPack?: number; quantity: number }[],
    );

    if (orderTotal <= 0) {
      return NextResponse.json({ error: "Order has no priced items" }, { status: 400 });
    }

    const depositAmount = calculateDeposit(orderTotal);

    // pay_later (invoice) — no payment processor needed
    if (paymentOption === "pay_later") {
      order.paymentOption = "pay_later";
      order.paymentStatus = "none";
      order.depositAmount = depositAmount;
      order.status = "confirmed";
      await order.save();

      // Consume reserved stock (invoice is a commitment)
      for (const item of (order.items ?? []) as { productId: unknown; quantity: number; packSize?: number }[]) {
        const packs = Math.floor(item.quantity / (item.packSize ?? 1));
        if (packs > 0) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { packsInStock: -packs, packsReserved: -packs } }
          ).catch(() => {});
        }
      }

      return NextResponse.json({
        id: order._id.toString(),
        status: "confirmed",
        paymentOption: "pay_later",
        redirectUrl: null,
      });
    }

    // pay_now and pay_deposit — Stripe Checkout
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Payment gateway is not configured. Contact support." },
        { status: 503 }
      );
    }

    const amountToCharge = paymentOption === "pay_deposit" ? depositAmount : orderTotal;

    const user = await User.findById(session.userId).select("email stripeCustomerId");
    const shopperEmail = user?.email ?? "customer@claudiab2b.com";

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    let session_url: string;
    let stripeSessionId: string;
    let stripeCustomerId: string;
    try {
      const checkout = await createCheckoutSession({
        orderId: id,
        description: paymentOption === "pay_deposit"
          ? `Claudia.C B2B — 10% Deposit (Order ${order._id.toString().slice(-8)})`
          : `Claudia.C B2B — Full Payment (Order ${order._id.toString().slice(-8)})`,
        amount: amountToCharge,
        currency: "GBP",
        customerEmail: shopperEmail,
        successUrl: `${baseUrl}/checkout/result?orderId=${id}&status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/checkout/result?orderId=${id}&status=cancelled`,
        metadata: { paymentOption },
        stripeCustomerId: user?.stripeCustomerId,
      });
      session_url = checkout.url;
      stripeSessionId = checkout.id;
      stripeCustomerId = checkout.stripeCustomerId;
    } catch (err) {
      console.error("Stripe error:", err);
      return NextResponse.json(
        { error: "Online payment is currently unavailable. Please contact the office to place your order by phone." },
        { status: 503 }
      );
    }

    if (user && user.stripeCustomerId !== stripeCustomerId) {
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Save payment info to order
    order.paymentOption = paymentOption === "pay_deposit" ? "pay_deposit" : "pay_now";
    order.paymentStatus = "pending";
    order.stripeSessionId = stripeSessionId;
    order.depositAmount = depositAmount;
    order.amountPaid = amountToCharge;
    await order.save();

    await audit({
      action: "payment_initiated",
      userId: session.userId.toString(),
      targetType: "order",
      targetId: id,
      ip: getClientIp(request),
      details: { paymentOption, amount: amountToCharge, stripeSessionId },
    });

    return NextResponse.json({
      id: order._id.toString(),
      paymentOption,
      amountToCharge,
      redirectUrl: session_url,
    });
  } catch (e) {
    console.error("Payment initiation error:", e);
    return NextResponse.json(
      { error: "Payment could not be processed. Please contact the office." },
      { status: 500 }
    );
  }
}
