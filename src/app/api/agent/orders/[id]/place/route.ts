import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAgent } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { assertOwnsCustomer } from "@/lib/agentOwnership";
import { reserveStock, releaseReservation, consumePayLaterStock } from "@/lib/orderService";
import { getEnabledPaymentOptions } from "@/lib/paymentOptionsServer";
import { isPaymentOptionEnabled } from "@/lib/paymentOptions";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { calculateOrderTotal, calculateDeposit } from "@/lib/pricing";
import { encrypt } from "@/lib/encrypt";
import { buildOrderPdf } from "@/lib/buildOrderPdf";
import { sendNewOrderEmail, sendCustomerOrderEmail } from "@/lib/adminNotifications";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const deliverySchema = z.object({
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postcode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  vatNumber: z.string().max(50).optional(),
  companyName: z.string().max(200).optional(),
});

const bodySchema = z.object({
  signatureDataUrl: z.string().max(2_000_000).refine((s) => s.startsWith("data:") || s.startsWith("http"), "Must be a data URL"),
  paymentOption: z.enum(["pay_now", "pay_deposit", "pay_later"]),
  deliverySnapshot: deliverySchema.optional(),
  specialInstructions: z.string().max(2000).optional(),
});

/**
 * POST /api/agent/orders/[id]/place — the customer signs on the agent's device,
 * then the order is placed with the chosen (enabled) payment option. pay_later
 * confirms unpaid; pay_now/pay_deposit return a Stripe Checkout URL to pay on
 * the device (card / Apple Pay / Google Pay / Klarna).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await requireAgent();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Signature and payment option required", details: parsed.error.flatten() }, { status: 400 });
    const { signatureDataUrl, paymentOption, deliverySnapshot, specialInstructions } = parsed.data;

    const enabled = await getEnabledPaymentOptions();
    if (!isPaymentOptionEnabled(enabled, paymentOption)) {
      return NextResponse.json({ error: "That payment option is not available." }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "pending") return NextResponse.json({ error: "Order already placed" }, { status: 400 });
    if (!order.items || order.items.length === 0) return NextResponse.json({ error: "Basket is empty" }, { status: 400 });

    // Ownership: the agent must own this customer, and own this basket.
    const customer = await assertOwnsCustomer(agent, String(order.userId));
    if (order.agentId && String(order.agentId) !== agent.id && agent.role !== "admin") {
      return NextResponse.json({ error: "This basket belongs to another agent." }, { status: 403 });
    }

    const items = order.items as { productId: mongoose.Types.ObjectId; sku: string; quantity: number; packSize?: number; pricePerPiece?: number; pricePerPack?: number }[];

    // Reserve stock atomically.
    const reserved = await reserveStock(items);
    if (!reserved.ok) return NextResponse.json({ error: reserved.error }, { status: 409 });

    // Delivery snapshot: prefer the supplied one, else the customer's saved address.
    const fullCustomer = await User.findById(order.userId).select("email name companyName vatNumber deliveryAddress stripeCustomerId");
    const savedAddr = (fullCustomer?.deliveryAddress ?? {}) as Record<string, string>;
    const ds = deliverySnapshot ?? (savedAddr.addressLine1 ? {
      addressLine1: savedAddr.addressLine1, addressLine2: savedAddr.addressLine2, city: savedAddr.city,
      postcode: savedAddr.postcode, country: savedAddr.country,
    } : null);
    if (!ds || !ds.addressLine1) {
      await releaseReservation(items);
      return NextResponse.json({ error: "A delivery address is required." }, { status: 400 });
    }

    order.deliverySnapshot = {
      addressLine1: ds.addressLine1, addressLine2: ds.addressLine2 ?? "", city: ds.city,
      postcode: ds.postcode, country: ds.country,
      vatNumber: ds.vatNumber ?? fullCustomer?.vatNumber ?? "", companyName: ds.companyName ?? fullCustomer?.companyName ?? "",
    };
    order.specialInstructions = specialInstructions?.trim() ?? "";
    order.agentId = new mongoose.Types.ObjectId(agent.id);
    order.signatureDataUrl = encrypt(signatureDataUrl);
    order.signedAt = new Date();
    order.status = "signed";
    order.paymentOption = paymentOption;

    const orderTotal = calculateOrderTotal(items);
    const depositAmount = calculateDeposit(orderTotal);
    order.depositAmount = depositAmount;

    let redirectUrl: string | null = null;

    if (paymentOption === "pay_later") {
      order.paymentStatus = "none";
      order.status = "confirmed";
      try {
        await order.save();
      } catch (saveErr) {
        await releaseReservation(items);
        throw saveErr;
      }
      await consumePayLaterStock(items);
    } else {
      // pay_now / pay_deposit → Stripe Checkout on the agent's device.
      if (!isStripeConfigured() || orderTotal <= 0) {
        await releaseReservation(items);
        return NextResponse.json({ error: "Online payment is unavailable for this order." }, { status: 503 });
      }
      const amount = paymentOption === "pay_deposit" ? depositAmount : orderTotal;
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      try {
        const checkout = await createCheckoutSession({
          orderId: id,
          description: paymentOption === "pay_deposit"
            ? `Claudia.C B2B — 10% Deposit (Order ${id.slice(-8)})`
            : `Claudia.C B2B — Full Payment (Order ${id.slice(-8)})`,
          amount,
          currency: "GBP",
          customerEmail: fullCustomer?.email ?? "customer@claudiab2b.com",
          successUrl: `${baseUrl}/checkout/result?orderId=${id}&status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}/checkout/result?orderId=${id}&status=cancelled`,
          metadata: { paymentOption, placedByAgent: agent.id },
          stripeCustomerId: fullCustomer?.stripeCustomerId,
        });
        order.paymentStatus = "pending";
        order.stripeSessionId = checkout.id;
        order.amountPaid = amount;
        if (fullCustomer && fullCustomer.stripeCustomerId !== checkout.stripeCustomerId) {
          fullCustomer.stripeCustomerId = checkout.stripeCustomerId;
          await fullCustomer.save();
        }
        await order.save();
        redirectUrl = checkout.url;
      } catch (err) {
        await releaseReservation(items);
        console.error("agent place stripe error:", err);
        return NextResponse.json({ error: "Online payment is currently unavailable." }, { status: 503 });
      }
    }

    await audit({
      action: "agent_order_placed",
      userId: agent.id,
      targetType: "order",
      targetId: id,
      ip: getClientIp(request),
      details: { customerId: String(order.userId), paymentOption, total: orderTotal },
    });

    // Fire-and-forget: PDF + emails (admins + the customer), same as customer checkout.
    (async () => {
      const built = await buildOrderPdf(id).catch(() => null);
      const attachment = built ? { filename: built.filename, content: built.buffer } : undefined;
      await sendNewOrderEmail({
        orderId: id, orderShortCode: id.slice(-8),
        customerName: customer.name, customerCompany: fullCustomer?.companyName, customerEmail: customer.email,
        total: orderTotal, paymentOption, paymentStatus: order.paymentStatus ?? "none",
        itemCount: order.items.length, signedAt: order.signedAt as Date, attachment,
      });
      if (customer.email) {
        await sendCustomerOrderEmail({ to: customer.email, customerName: customer.name, orderShortCode: id.slice(-8), total: orderTotal, itemCount: order.items.length, attachment });
      }
    })().catch((err) => console.error("agent place emails failed:", err));

    return NextResponse.json({ id, status: order.status, paymentOption, redirectUrl });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: err.message || "Forbidden" }, { status: 403 });
    if (err.status === 404) return NextResponse.json({ error: err.message || "Not found" }, { status: 404 });
    console.error("agent place order error:", e);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
