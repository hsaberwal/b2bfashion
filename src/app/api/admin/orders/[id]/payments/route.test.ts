import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAdmin,
  mockConnectDB,
  mockOrderFindById,
  mockPaymentCreate,
  mockPaymentFind,
  mockAudit,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockOrderFindById: vi.fn(),
  mockPaymentCreate: vi.fn(),
  mockPaymentFind: vi.fn(),
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/requireAdmin", () => ({
  requireAdmin: (...a: unknown[]) => mockRequireAdmin(...a),
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/lib/audit", () => ({ audit: (...a: unknown[]) => mockAudit(...a) }));
vi.mock("@/lib/rateLimit", () => ({ getClientIp: () => "2.2.2.2" }));
vi.mock("@/models/Order", () => ({
  Order: { findById: (...a: unknown[]) => mockOrderFindById(...a) },
}));
vi.mock("@/models/Payment", () => ({
  Payment: {
    create: (...a: unknown[]) => mockPaymentCreate(...a),
    find: (...a: unknown[]) => mockPaymentFind(...a),
  },
}));

const VALID_ID = "507f1f77bcf86cd799439011";

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => VALID_ID },
    userId: "user1",
    items: [{ pricePerPiece: 25, quantity: 4 }], // total = 100
    paymentOption: "pay_deposit",
    depositAmount: 10,
    paymentStatus: "none",
    depositPaid: false,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as Record<string, unknown>;
}

function postReq(body: unknown) {
  return new Request("http://x/api/admin/orders/" + VALID_ID + "/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockConnectDB.mockReset();
  mockOrderFindById.mockReset();
  mockPaymentCreate.mockReset();
  mockPaymentFind.mockReset();
  mockAudit.mockReset();
  // ObjectId-valid hex string so `new mongoose.Types.ObjectId(admin.id)` works inside the route.
  mockRequireAdmin.mockResolvedValue({ id: "507f1f77bcf86cd799439099", role: "admin" });
  mockConnectDB.mockResolvedValue(undefined);
  mockPaymentCreate.mockResolvedValue({ _id: "pay_new" });
  mockAudit.mockResolvedValue(undefined);
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/orders/[id]/payments", () => {
  it("returns 401 without auth", async () => {
    mockRequireAdmin.mockRejectedValueOnce(Object.assign(new Error("u"), { status: 401 }));
    const { POST } = await import("./route");
    const res = await POST(postReq({ amount: 10, method: "cash" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid order id", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://x/api/admin/orders/zzz/payments", { method: "POST", body: JSON.stringify({ amount: 10, method: "cash" }) }) as never,
      { params: Promise.resolve({ id: "zzz" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid body (missing method)", async () => {
    const { POST } = await import("./route");
    const res = await POST(postReq({ amount: 10 }) as never, { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-positive amount", async () => {
    const { POST } = await import("./route");
    const res = await POST(postReq({ amount: 0, method: "cash" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when order not found", async () => {
    mockOrderFindById.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(postReq({ amount: 10, method: "cash" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("partial payment leaves outstanding > 0 and does not mark paid", async () => {
    const order = buildOrder();
    mockOrderFindById.mockResolvedValueOnce(order);
    mockPaymentFind.mockReturnValueOnce({
      select: () => ({ lean: () => Promise.resolve([{ amount: 30 }]) }),
    });
    const { POST } = await import("./route");
    const res = await POST(postReq({ amount: 30, method: "bank_transfer" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.outstanding).toBe(70);
    expect(data.paymentStatus).toBe("none");
    expect(order.paymentStatus).toBe("none");
  });

  it("payment meeting deposit threshold flips depositPaid", async () => {
    // Order total 100, deposit 10. Payment of 10 → depositPaid true, still 90 outstanding.
    const order = buildOrder();
    mockOrderFindById.mockResolvedValueOnce(order);
    mockPaymentFind.mockReturnValueOnce({
      select: () => ({ lean: () => Promise.resolve([{ amount: 10 }]) }),
    });
    const { POST } = await import("./route");
    await POST(postReq({ amount: 10, method: "cash" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(order.depositPaid).toBe(true);
    expect(order.paymentStatus).toBe("none");
  });

  it("payment closing outstanding flips paymentStatus to paid and depositPaid for pay_deposit orders", async () => {
    const order = buildOrder();
    mockOrderFindById.mockResolvedValueOnce(order);
    mockPaymentFind.mockReturnValueOnce({
      select: () => ({ lean: () => Promise.resolve([{ amount: 100 }]) }),
    });
    const { POST } = await import("./route");
    const res = await POST(postReq({ amount: 100, method: "bank_transfer" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    const data = await res.json();
    expect(data.outstanding).toBe(0);
    expect(data.paymentStatus).toBe("paid");
    expect(order.depositPaid).toBe(true);
  });

  it("writes an audit log entry", async () => {
    const order = buildOrder();
    mockOrderFindById.mockResolvedValueOnce(order);
    mockPaymentFind.mockReturnValueOnce({
      select: () => ({ lean: () => Promise.resolve([{ amount: 5 }]) }),
    });
    const { POST } = await import("./route");
    await POST(postReq({ amount: 5, method: "cheque", reference: "CHQ-001" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payment_recorded",
        targetType: "order",
        targetId: VALID_ID,
        details: expect.objectContaining({ amount: 5, method: "cheque", reference: "CHQ-001" }),
      }),
    );
  });
});
