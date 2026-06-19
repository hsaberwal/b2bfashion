import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { constructWebhookEvent } from "@/lib/stripe";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import type Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Authoritative payment-status updates from Stripe. Verified via the
 * stripe-signature header against STRIPE_WEBHOOK_SECRET.
 *
 * Configure the URL in your Stripe dashboard (Developers → Webhooks).
 * Events to subscribe to:
 *   - checkout.session.completed   → mark order paid, consume stock
 *   - checkout.session.expired     → release reservation
 *   - checkout.session.async_payment_failed → release reservation
 *   - charge.refunded              → mark order refunded
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const signature = request.headers.get("stripe-signature");

  // Stripe requires the raw, unparsed body for signature verification.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await connectDB();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (!orderId) break;

        const order = await Order.findById(orderId);
        if (!order) {
          console.warn("Stripe webhook: order not found for orderId:", orderId);
          break;
        }

        order.paymentStatus = "paid";
        order.status = "confirmed";
        if (typeof session.payment_intent === "string") {
          order.stripePaymentIntentId = session.payment_intent;
        }
        if (order.paymentOption === "pay_deposit") {
          order.depositPaid = true;
        }
        await order.save();

        // Record the captured amount as a Payment row (idempotent on
        // stripePaymentIntentId so webhook replays don't double-count).
        const captured = typeof session.amount_total === "number"
          ? session.amount_total / 100
          : (order.amountPaid ?? 0);
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
        await Payment.updateOne(
          paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : { _id: new (await import("mongoose")).default.Types.ObjectId() },
          {
            $setOnInsert: {
              orderId: order._id,
              userId: order.userId,
              amount: captured,
              currency: (session.currency ?? "gbp").toUpperCase(),
              method: "stripe",
              stripePaymentIntentId: paymentIntentId,
              reference: session.id,
              note: order.paymentOption === "pay_deposit" ? "10% deposit (Stripe)" : "Full payment (Stripe)",
            },
          },
          { upsert: true }
        );

        // Consume reserved stock (move from reserved to sold)
        const items = (order.items ?? []) as { productId: unknown; quantity: number; packSize?: number }[];
        for (const item of items) {
          const packs = Math.floor(item.quantity / (item.packSize ?? 1));
          if (packs > 0) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { packsInStock: -packs, packsReserved: -packs } }
            ).catch(() => {});
          }
        }

        await audit({
          action: "payment_completed",
          targetType: "order",
          targetId: order._id.toString(),
          ip,
          details: { stripeSessionId: session.id, via: "webhook" },
        });
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (!orderId) break;

        const order = await Order.findById(orderId);
        if (!order) break;

        // Only release if still pending — don't undo a paid status
        if (order.paymentStatus !== "pending") break;

        order.paymentStatus = event.type === "checkout.session.expired" ? "none" : "failed";
        await order.save();

        const items = (order.items ?? []) as { productId: unknown; quantity: number; packSize?: number }[];
        for (const item of items) {
          const packs = Math.floor(item.quantity / (item.packSize ?? 1));
          if (packs > 0) {
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { packsReserved: -packs } }
            ).catch(() => {});
          }
        }

        await audit({
          action: "payment_failed",
          targetType: "order",
          targetId: order._id.toString(),
          ip,
          details: { stripeSessionId: session.id, eventType: event.type, via: "webhook" },
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (!paymentIntentId) break;

        const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
        if (!order) break;

        // Only flip the whole order to "refunded" on a FULL refund. Partial
        // refunds (e.g. one pack removed from a multi-pack order) leave the
        // order paid — the per-item refund state is tracked on the line itself.
        const fullyRefunded =
          typeof charge.amount === "number" &&
          typeof charge.amount_refunded === "number" &&
          charge.amount_refunded >= charge.amount;
        if (fullyRefunded) {
          order.paymentStatus = "refunded";
          await order.save();
        }

        await audit({
          action: "payment_failed",
          targetType: "order",
          targetId: order._id.toString(),
          ip,
          details: { paymentIntentId, refunded: true, via: "webhook" },
        });
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    // Return 200 so Stripe doesn't retry forever on non-recoverable bugs.
    // Real failures are caught above by the signature check.
    return NextResponse.json({ received: true, warning: "handler error" }, { status: 200 });
  }
}
