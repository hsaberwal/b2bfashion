import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Hoisted mocks so the vi.mock factory below can reference them.
const {
  mockSessionsCreate,
  mockSessionsRetrieve,
  mockConstructEvent,
  mockCustomersCreate,
  mockCustomersRetrieve,
} = vi.hoisted(() => ({
  mockSessionsCreate: vi.fn(),
  mockSessionsRetrieve: vi.fn(),
  mockConstructEvent: vi.fn(),
  mockCustomersCreate: vi.fn(),
  mockCustomersRetrieve: vi.fn(),
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
      customers: {
        create: mockCustomersCreate,
        retrieve: mockCustomersRetrieve,
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
  mockCustomersCreate.mockReset();
  mockCustomersRetrieve.mockReset();
  // Sensible defaults so tests that don't care about customer behaviour
  // still pass — createCheckoutSession always resolves a customer first.
  mockCustomersCreate.mockResolvedValue({ id: "cus_new_default" });
  mockCustomersRetrieve.mockResolvedValue({ id: "cus_existing_default" });
  // Reset the module cache so the lazy `cachedClient` is rebuilt each test.
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isStripeConfigured", () => {
  it("returns true when STRIPE_SECRET_KEY is set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const { isStripeConfigured } = await import("./stripe");
    expect(isStripeConfigured()).toBe(true);
  });

  it("returns false when STRIPE_SECRET_KEY is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { isStripeConfigured } = await import("./stripe");
    expect(isStripeConfigured()).toBe(false);
  });
});

describe("createCheckoutSession", () => {
  it("converts GBP amount to minor units (pence) and lowercases currency", async () => {
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
  });

  it("rounds floating-point amounts to whole pence", async () => {
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

  it("propagates orderId and extra metadata onto session and payment_intent", async () => {
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

  it("defaults currency to GBP when not provided", async () => {
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

  it("returns the session id, url, and resolved customer id", async () => {
    mockSessionsCreate.mockResolvedValue({
      id: "cs_real",
      url: "https://checkout.stripe.com/session/cs_real",
    });
    mockCustomersCreate.mockResolvedValue({ id: "cus_real" });
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
      stripeCustomerId: "cus_real",
    });
  });

  it("throws if Stripe doesn't return a checkout URL", async () => {
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

  it("throws when STRIPE_SECRET_KEY is missing", async () => {
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

  it("creates a fresh customer with default country GB when no existing id is passed", async () => {
    mockSessionsCreate.mockResolvedValue({ id: "cs_a", url: "https://a" });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    const { createCheckoutSession } = await import("./stripe");
    await createCheckoutSession({
      orderId: "o",
      description: "d",
      amount: 10,
      customerEmail: "buyer@example.com",
      successUrl: "https://x",
      cancelUrl: "https://y",
    });
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "buyer@example.com",
      address: { country: "GB" },
    });
    const args = (mockSessionsCreate as Mock).mock.calls[0][0];
    expect(args.customer).toBe("cus_new");
  });

  it("respects an explicit defaultCountry", async () => {
    mockSessionsCreate.mockResolvedValue({ id: "cs_b", url: "https://b" });
    mockCustomersCreate.mockResolvedValue({ id: "cus_b" });
    const { createCheckoutSession } = await import("./stripe");
    await createCheckoutSession({
      orderId: "o",
      description: "d",
      amount: 10,
      customerEmail: "buyer@example.com",
      successUrl: "https://x",
      cancelUrl: "https://y",
      defaultCountry: "fr",
    });
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "buyer@example.com",
      address: { country: "FR" },
    });
  });

  it("reuses an existing customer id when it's still valid in Stripe", async () => {
    mockSessionsCreate.mockResolvedValue({ id: "cs_c", url: "https://c" });
    mockCustomersRetrieve.mockResolvedValue({ id: "cus_existing", deleted: false });
    const { createCheckoutSession } = await import("./stripe");
    const result = await createCheckoutSession({
      orderId: "o",
      description: "d",
      amount: 10,
      customerEmail: "buyer@example.com",
      successUrl: "https://x",
      cancelUrl: "https://y",
      stripeCustomerId: "cus_existing",
    });
    expect(mockCustomersRetrieve).toHaveBeenCalledWith("cus_existing");
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(result.stripeCustomerId).toBe("cus_existing");
  });

  it("falls back to creating a new customer when the existing id is deleted in Stripe", async () => {
    mockSessionsCreate.mockResolvedValue({ id: "cs_d", url: "https://d" });
    mockCustomersRetrieve.mockResolvedValue({ id: "cus_old", deleted: true });
    mockCustomersCreate.mockResolvedValue({ id: "cus_fresh" });
    const { createCheckoutSession } = await import("./stripe");
    const result = await createCheckoutSession({
      orderId: "o",
      description: "d",
      amount: 10,
      customerEmail: "buyer@example.com",
      successUrl: "https://x",
      cancelUrl: "https://y",
      stripeCustomerId: "cus_old",
    });
    expect(mockCustomersCreate).toHaveBeenCalled();
    expect(result.stripeCustomerId).toBe("cus_fresh");
  });

  it("falls back to creating a new customer when retrieve throws (e.g. id unknown)", async () => {
    mockSessionsCreate.mockResolvedValue({ id: "cs_e", url: "https://e" });
    mockCustomersRetrieve.mockRejectedValue(new Error("No such customer"));
    mockCustomersCreate.mockResolvedValue({ id: "cus_recreated" });
    const { createCheckoutSession } = await import("./stripe");
    const result = await createCheckoutSession({
      orderId: "o",
      description: "d",
      amount: 10,
      customerEmail: "buyer@example.com",
      successUrl: "https://x",
      cancelUrl: "https://y",
      stripeCustomerId: "cus_phantom",
    });
    expect(result.stripeCustomerId).toBe("cus_recreated");
  });

  it("forces en-GB locale, requires billing address, and lets Stripe overwrite the address from shopper input", async () => {
    mockSessionsCreate.mockResolvedValue({ id: "cs_f", url: "https://f" });
    const { createCheckoutSession } = await import("./stripe");
    await createCheckoutSession({
      orderId: "o",
      description: "d",
      amount: 10,
      customerEmail: "a@b.com",
      successUrl: "https://x",
      cancelUrl: "https://y",
    });
    const args = (mockSessionsCreate as Mock).mock.calls[0][0];
    expect(args.locale).toBe("en-GB");
    expect(args.billing_address_collection).toBe("required");
    expect(args.customer_update).toEqual({ address: "auto", name: "auto" });
  });
});

describe("constructWebhookEvent", () => {
  it("rejects when signature header is missing", async () => {
    const { constructWebhookEvent } = await import("./stripe");
    expect(() => constructWebhookEvent("payload", null)).toThrow(/signature/i);
  });

  it("rejects when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { constructWebhookEvent } = await import("./stripe");
    expect(() => constructWebhookEvent("payload", "t=1,v1=hash")).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("delegates to Stripe SDK when both inputs are present", async () => {
    mockConstructEvent.mockReturnValue({ type: "checkout.session.completed", data: {} });
    const { constructWebhookEvent } = await import("./stripe");
    const event = constructWebhookEvent("payload", "t=1,v1=hash");
    expect(mockConstructEvent).toHaveBeenCalledWith("payload", "t=1,v1=hash", "whsec_dummy");
    expect(event.type).toBe("checkout.session.completed");
  });
});

describe("retrieveSession", () => {
  it("calls the Stripe SDK with the session id", async () => {
    mockSessionsRetrieve.mockResolvedValue({ id: "cs_x", payment_status: "paid" });
    const { retrieveSession } = await import("./stripe");
    const session = await retrieveSession("cs_x");
    expect(mockSessionsRetrieve).toHaveBeenCalledWith("cs_x");
    expect(session.payment_status).toBe("paid");
  });
});
