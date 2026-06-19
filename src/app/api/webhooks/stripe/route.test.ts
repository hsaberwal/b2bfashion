import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockConstructEvent,
  mockConnectDB,
  mockOrderFindById,
  mockOrderFindOne,
  mockProductUpdateOne,
  mockPaymentUpdateOne,
  mockAudit,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockConnectDB: vi.fn(),
  mockOrderFindById: vi.fn(),
  mockOrderFindOne: vi.fn(),
  mockProductUpdateOne: vi.fn(),
  mockPaymentUpdateOne: vi.fn(),
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  constructWebhookEvent: (...a: unknown[]) => mockConstructEvent(...a),
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/lib/audit", () => ({ audit: (...a: unknown[]) => mockAudit(...a) }));
vi.mock("@/lib/rateLimit", () => ({ getClientIp: () => "1.2.3.4" }));
vi.mock("@/models/Order", () => ({
  Order: {
    findById: (...a: unknown[]) => mockOrderFindById(...a),
    findOne: (...a: unknown[]) => mockOrderFindOne(...a),
  },
}));
vi.mock("@/models/Product", () => ({
  Product: { updateOne: (...a: unknown[]) => mockProductUpdateOne(...a) },
}));
vi.mock("@/models/Payment", () => ({
  Payment: { updateOne: (...a: unknown[]) => mockPaymentUpdateOne(...a) },
}));

function postReq(body: string, signature: string | null = "t=1,v1=hash") {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature) headers["stripe-signature"] = signature;
  return new Request("http://x/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  mockConstructEvent.mockReset();
  mockConnectDB.mockReset();
  mockOrderFindById.mockReset();
  mockOrderFindOne.mockReset();
  mockProductUpdateOne.mockReset();
  mockPaymentUpdateOne.mockReset();
  mockAudit.mockReset();
  mockConnectDB.mockResolvedValue(undefined);
  mockProductUpdateOne.mockResolvedValue({ matchedCount: 1 });
  mockPaymentUpdateOne.mockResolvedValue({ upsertedCount: 1 });
  mockAudit.mockResolvedValue(undefined);
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when signature verification throws", async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error("bad sig");
    });
    const { POST } = await import("./route");
    const res = await POST(postReq("{}") as never);
    expect(res.status).toBe(400);
  });

  it("upserts a Payment row idempotent on payment_intent for checkout.session.completed", async () => {
    const order = {
      _id: "507f1f77bcf86cd799439011",
      userId: "u1",
      items: [{ productId: "p1", quantity: 4, packSize: 2 }],
      paymentOption: "pay_now",
      save: vi.fn().mockResolvedValue(undefined),
    } as Record<string, unknown>;
    mockOrderFindById.mockResolvedValueOnce(order);
    mockConstructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          metadata: { orderId: "507f1f77bcf86cd799439011" },
          payment_intent: "pi_test_1",
          amount_total: 4500, // 45.00
          currency: "gbp",
        },
      },
    });
    const { POST } = await import("./route");
    const res = await POST(postReq("{}") as never);
    expect(res.status).toBe(200);
    expect(mockPaymentUpdateOne).toHaveBeenCalled();
    // Filter side should be keyed on stripePaymentIntentId so retries are idempotent.
    const callArgs = mockPaymentUpdateOne.mock.calls[0];
    expect(callArgs[0]).toEqual({ stripePaymentIntentId: "pi_test_1" });
    expect(callArgs[2]).toEqual({ upsert: true });
    // Insert payload uses amount_total / 100 as the captured amount.
    expect(callArgs[1].$setOnInsert.amount).toBe(45);
    expect(callArgs[1].$setOnInsert.method).toBe("stripe");
    // Order should be saved with paid status / confirmed
    expect(order.paymentStatus).toBe("paid");
    expect(order.status).toBe("confirmed");
    expect(order.save).toHaveBeenCalled();
  });

  it("doesn't crash if the order metadata is missing", async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: { object: { id: "cs_x", metadata: {}, amount_total: 0 } },
    });
    const { POST } = await import("./route");
    const res = await POST(postReq("{}") as never);
    expect(res.status).toBe(200);
    // No order to update, so Payment.updateOne should not be called.
    expect(mockPaymentUpdateOne).not.toHaveBeenCalled();
  });

  it("releases reservation on checkout.session.expired (paymentStatus stays not-paid)", async () => {
    const order = {
      _id: "o1",
      items: [{ productId: "p1", quantity: 2, packSize: 2 }],
      paymentStatus: "pending",
      save: vi.fn().mockResolvedValue(undefined),
    } as Record<string, unknown>;
    mockOrderFindById.mockResolvedValueOnce(order);
    mockConstructEvent.mockReturnValueOnce({
      type: "checkout.session.expired",
      data: { object: { id: "cs_y", metadata: { orderId: "o1" } } },
    });
    const { POST } = await import("./route");
    const res = await POST(postReq("{}") as never);
    expect(res.status).toBe(200);
    expect(order.paymentStatus).toBe("none");
    expect(mockProductUpdateOne).toHaveBeenCalledWith(
      { _id: "p1" },
      { $inc: { packsReserved: -1 } },
    );
  });

  it("does not release reservation when the order is already paid (idempotency guard)", async () => {
    const order = {
      _id: "o1",
      items: [{ productId: "p1", quantity: 2, packSize: 2 }],
      paymentStatus: "paid",
      save: vi.fn().mockResolvedValue(undefined),
    } as Record<string, unknown>;
    mockOrderFindById.mockResolvedValueOnce(order);
    mockConstructEvent.mockReturnValueOnce({
      type: "checkout.session.expired",
      data: { object: { id: "cs_z", metadata: { orderId: "o1" } } },
    });
    const { POST } = await import("./route");
    await POST(postReq("{}") as never);
    expect(order.paymentStatus).toBe("paid"); // unchanged
    expect(mockProductUpdateOne).not.toHaveBeenCalled();
  });

  it("marks order refunded on a FULL charge.refunded", async () => {
    const order = {
      paymentStatus: "paid",
      save: vi.fn().mockResolvedValue(undefined),
      _id: "o1",
    } as Record<string, unknown>;
    mockOrderFindOne.mockResolvedValueOnce(order);
    mockConstructEvent.mockReturnValueOnce({
      type: "charge.refunded",
      data: { object: { payment_intent: "pi_x", amount: 5000, amount_refunded: 5000 } },
    });
    const { POST } = await import("./route");
    await POST(postReq("{}") as never);
    expect(order.paymentStatus).toBe("refunded");
  });

  it("leaves order paid on a PARTIAL charge.refunded", async () => {
    const order = {
      paymentStatus: "paid",
      save: vi.fn().mockResolvedValue(undefined),
      _id: "o1",
    } as Record<string, unknown>;
    mockOrderFindOne.mockResolvedValueOnce(order);
    mockConstructEvent.mockReturnValueOnce({
      type: "charge.refunded",
      data: { object: { payment_intent: "pi_x", amount: 5000, amount_refunded: 1000 } },
    });
    const { POST } = await import("./route");
    await POST(postReq("{}") as never);
    expect(order.paymentStatus).toBe("paid"); // partial refund doesn't flip the whole order
  });

  it("ignores unknown event types without error", async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: "customer.created",
      data: { object: {} },
    });
    const { POST } = await import("./route");
    const res = await POST(postReq("{}") as never);
    expect(res.status).toBe(200);
  });
});
