import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Hoisted mocks so the vi.mock factory below can reference them.
const { mockSessionsCreate, mockSessionsRetrieve, mockConstructEvent } = vi.hoisted(() => ({
  mockSessionsCreate: vi.fn(),
  mockSessionsRetrieve: vi.fn(),
  mockConstructEvent: vi.fn(),
}));

// Mock the Stripe SDK at the module-resolution boundary. The mocked
// constructor returns the same set of stubs every time it's invoked.
vi.mock("stripe", () => {
  function Stripe() {
    return {
      checkout: {
        sessions: {
          create: mockSessionsCreate,
          retrieve: mockSessionsRetrieve,
        },
      },
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    };
  }
  return { default: Stripe };
});

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
  mockSessionsCreate.mockReset();
  mockSessionsRetrieve.mockReset();
  mockConstructEvent.mockReset();
  // Reset the module cache so the lazy `cachedClient` is rebuilt each test.
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isStripeConfigured", () => {
  it("returns true when STRIPE_SECRET_KEY is set", async () => {
    await (async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_x";
      const { isStripeConfigured } = await import("./stripe");
      expect(isStripeConfigured()).toBe(true);
    });
  });

  it("returns false when STRIPE_SECRET_KEY is missing", async () => {
    await (async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const { isStripeConfigured } = await import("./stripe");
      expect(isStripeConfigured()).toBe(false);
    });
  });
});

describe("createCheckoutSession", () => {
  it("converts GBP amount to minor units (pence) and lowercases currency", async () => {
    await (async () => {
      mockSessionsCreate.mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/session/cs_test_123",
      });

      const { createCheckoutSession } = await import("./stripe");
      await createCheckoutSession({
        orderId: "order-1",
        description: "Order 1",
        amount: 29.99,
        currency: "GBP",
        customerEmail: "buyer@example.com",
        successUrl: "https://example.com/ok",
        cancelUrl: "https://example.com/no",
      });

      const args = (mockSessionsCreate as Mock).mock.calls[0][0];
      expect(args.line_items[0].price_data.currency).toBe("gbp");
      expect(args.line_items[0].price_data.unit_amount).toBe(2999);
      expect(args.customer_email).toBe("buyer@example.com");
    });
  });

  it("rounds floating-point amounts to whole pence", async () => {
    await (async () => {
      mockSessionsCreate.mockResolvedValue({ id: "cs_x", url: "https://x" });
      const { createCheckoutSession } = await import("./stripe");
      // 33.335 × 100 = 3333.5000000000005 → must round to 3334
      await createCheckoutSession({
        orderId: "o",
        description: "d",
        amount: 33.335,
        customerEmail: "a@b.com",
        successUrl: "https://x",
        cancelUrl: "https://y",
      });
      const args = (mockSessionsCreate as Mock).mock.calls[0][0];
      expect(args.line_items[0].price_data.unit_amount).toBe(3334);
    });
  });

  it("propagates orderId and extra metadata onto session and payment_intent", async () => {
    await (async () => {
      mockSessionsCreate.mockResolvedValue({ id: "cs_y", url: "https://y" });
      const { createCheckoutSession } = await import("./stripe");
      await createCheckoutSession({
        orderId: "order-42",
        description: "d",
        amount: 10,
        customerEmail: "a@b.com",
        successUrl: "https://x",
        cancelUrl: "https://y",
        metadata: { paymentOption: "pay_deposit" },
      });
      const args = (mockSessionsCreate as Mock).mock.calls[0][0];
      expect(args.metadata).toEqual({ orderId: "order-42", paymentOption: "pay_deposit" });
      expect(args.payment_intent_data.metadata).toEqual({
        orderId: "order-42",
        paymentOption: "pay_deposit",
      });
    });
  });

  it("defaults currency to GBP when not provided", async () => {
    await (async () => {
      mockSessionsCreate.mockResolvedValue({ id: "cs_z", url: "https://z" });
      const { createCheckoutSession } = await import("./stripe");
      await createCheckoutSession({
        orderId: "order-1",
        description: "d",
        amount: 10,
        customerEmail: "a@b.com",
        successUrl: "https://x",
        cancelUrl: "https://y",
      });
      const args = (mockSessionsCreate as Mock).mock.calls[0][0];
      expect(args.line_items[0].price_data.currency).toBe("gbp");
    });
  });

  it("returns the session id and url from Stripe", async () => {
    await (async () => {
      mockSessionsCreate.mockResolvedValue({
        id: "cs_real",
        url: "https://checkout.stripe.com/session/cs_real",
      });
      const { createCheckoutSession } = await import("./stripe");
      const result = await createCheckoutSession({
        orderId: "order-1",
        description: "d",
        amount: 10,
        customerEmail: "a@b.com",
        successUrl: "https://x",
        cancelUrl: "https://y",
      });
      expect(result).toEqual({
        id: "cs_real",
        url: "https://checkout.stripe.com/session/cs_real",
      });
    });
  });

  it("throws if Stripe doesn't return a checkout URL", async () => {
    await (async () => {
      mockSessionsCreate.mockResolvedValue({ id: "cs_x" }); // no url
      const { createCheckoutSession } = await import("./stripe");
      await expect(
        createCheckoutSession({
          orderId: "order-1",
          description: "d",
          amount: 10,
          customerEmail: "a@b.com",
          successUrl: "https://x",
          cancelUrl: "https://y",
        }),
      ).rejects.toThrow(/Checkout Session URL/);
    });
  });

  it("throws when STRIPE_SECRET_KEY is missing", async () => {
    await (async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const { createCheckoutSession } = await import("./stripe");
      await expect(
        createCheckoutSession({
          orderId: "order-1",
          description: "d",
          amount: 10,
          customerEmail: "a@b.com",
          successUrl: "https://x",
          cancelUrl: "https://y",
        }),
      ).rejects.toThrow(/STRIPE_SECRET_KEY/);
    });
  });
});

describe("constructWebhookEvent", () => {
  it("rejects when signature header is missing", async () => {
    await (async () => {
      const { constructWebhookEvent } = await import("./stripe");
      expect(() => constructWebhookEvent("payload", null)).toThrow(/signature/i);
    });
  });

  it("rejects when STRIPE_WEBHOOK_SECRET is missing", async () => {
    await (async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const { constructWebhookEvent } = await import("./stripe");
      expect(() => constructWebhookEvent("payload", "t=1,v1=hash")).toThrow(/STRIPE_WEBHOOK_SECRET/);
    });
  });

  it("delegates to Stripe SDK when both inputs are present", async () => {
    await (async () => {
      mockConstructEvent.mockReturnValue({ type: "checkout.session.completed", data: {} });
      const { constructWebhookEvent } = await import("./stripe");
      const event = constructWebhookEvent("payload", "t=1,v1=hash");
      expect(mockConstructEvent).toHaveBeenCalledWith("payload", "t=1,v1=hash", "whsec_dummy");
      expect(event.type).toBe("checkout.session.completed");
    });
  });
});

describe("retrieveSession", () => {
  it("calls the Stripe SDK with the session id", async () => {
    await (async () => {
      mockSessionsRetrieve.mockResolvedValue({ id: "cs_x", payment_status: "paid" });
      const { retrieveSession } = await import("./stripe");
      const session = await retrieveSession("cs_x");
      expect(mockSessionsRetrieve).toHaveBeenCalledWith("cs_x");
      expect(session.payment_status).toBe("paid");
    });
  });
});
