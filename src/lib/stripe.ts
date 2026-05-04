/**
 * Stripe — Hosted Checkout Session integration.
 *
 * Flow:
 * 1. Server creates a Stripe Checkout Session with success/cancel URLs.
 * 2. Customer redirects to Stripe-hosted checkout (PCI offloaded).
 * 3. Stripe redirects back to success_url or cancel_url.
 * 4. Server-to-server webhook (checkout.session.completed) is the
 *    authoritative confirmation of payment.
 */

import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!cachedClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    cachedClient = new Stripe(key);
  }
  return cachedClient;
}

export type CheckoutSessionParams = {
  orderId: string;
  description: string;
  amount: number; // GBP, e.g. 29.99
  currency?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

/**
 * Create a Stripe Checkout Session and return its hosted URL.
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams,
): Promise<{ id: string; url: string }> {
  const stripe = getStripe();
  const currency = (params.currency ?? "GBP").toLowerCase();
  // Stripe expects the amount in the currency's minor units.
  const unitAmount = Math.round(params.amount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: params.description,
          },
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      orderId: params.orderId,
      ...(params.metadata ?? {}),
    },
    payment_intent_data: {
      metadata: {
        orderId: params.orderId,
        ...(params.metadata ?? {}),
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout Session URL");
  }
  return { id: session.id, url: session.url };
}

/**
 * Verify a Stripe webhook signature and parse the event.
 * Throws if the signature is missing/invalid (the caller should treat this
 * as an authentication failure and return 400/403).
 */
export function constructWebhookEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  if (!signature) throw new Error("Missing stripe-signature header");
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Retrieve a Checkout Session — used by the success-redirect page to
 * confirm the session paid (the redirect alone is not authoritative;
 * webhooks are, but a Session lookup is a safe sync check too).
 */
export async function retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
}
