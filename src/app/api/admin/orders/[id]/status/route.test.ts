import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAdmin, mockConnectDB, mockOrderFindById, mockAudit } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockOrderFindById: vi.fn(),
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/requireAdmin", () => ({
  requireAdmin: (...a: unknown[]) => mockRequireAdmin(...a),
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/lib/audit", () => ({ audit: (...a: unknown[]) => mockAudit(...a) }));
vi.mock("@/lib/rateLimit", () => ({ getClientIp: () => "1.1.1.1" }));
vi.mock("@/models/Order", () => ({
  Order: { findById: (...a: unknown[]) => mockOrderFindById(...a) },
}));

const VALID_ID = "507f1f77bcf86cd799439011"; // 24-char hex — passes ObjectId.isValid

function buildOrder(overrides: Record<string, unknown> = {}) {
  const o: Record<string, unknown> = {
    _id: { toString: () => VALID_ID },
    status: "confirmed",
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return o;
}

function postReq(body: unknown) {
  return new Request("http://x/api/admin/orders/" + VALID_ID + "/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockConnectDB.mockReset();
  mockOrderFindById.mockReset();
  mockAudit.mockReset();
  mockRequireAdmin.mockResolvedValue({ id: "admin1", email: "admin@x.com", role: "admin" });
  mockConnectDB.mockResolvedValue(undefined);
  mockAudit.mockResolvedValue(undefined);
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/orders/[id]/status", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockRejectedValueOnce(Object.assign(new Error("u"), { status: 401 }));
    const { POST } = await import("./route");
    const res = await POST(postReq({ status: "picked" }) as never, { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid order id", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://x/api/admin/orders/notanid/status", {
        method: "POST",
        body: JSON.stringify({ status: "picked" }),
      }) as never,
      { params: Promise.resolve({ id: "notanid" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unsupported status string", async () => {
    const { POST } = await import("./route");
    const res = await POST(postReq({ status: "magically-shipped" }) as never, {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the order isn't found", async () => {
    mockOrderFindById.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(postReq({ status: "picked" }) as never, { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(404);
  });

  it("stamps pickedAt when transitioning to picked", async () => {
    const order = buildOrder();
    mockOrderFindById.mockResolvedValueOnce(order);
    const { POST } = await import("./route");
    const res = await POST(postReq({ status: "picked" }) as never, { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    expect(order.status).toBe("picked");
    expect(order.pickedAt).toBeInstanceOf(Date);
    expect(order.save).toHaveBeenCalled();
  });

  it("stamps shippedAt + writes carrier/tracking when transitioning to shipped", async () => {
    const order = buildOrder({ status: "ready_to_ship" });
    mockOrderFindById.mockResolvedValueOnce(order);
    const { POST } = await import("./route");
    await POST(
      postReq({ status: "shipped", shippingCarrier: "Royal Mail", shippingTrackingNumber: "RM123" }) as never,
      { params: Promise.resolve({ id: VALID_ID }) },
    );
    expect(order.shippedAt).toBeInstanceOf(Date);
    expect(order.shippingCarrier).toBe("Royal Mail");
    expect(order.shippingTrackingNumber).toBe("RM123");
  });

  it("does not overwrite an existing pickedAt timestamp on a repeat call", async () => {
    const original = new Date("2020-01-01");
    const order = buildOrder({ pickedAt: original, status: "picked" });
    mockOrderFindById.mockResolvedValueOnce(order);
    const { POST } = await import("./route");
    await POST(postReq({ status: "picked" }) as never, { params: Promise.resolve({ id: VALID_ID }) });
    expect(order.pickedAt).toBe(original);
  });

  it("writes an audit log entry on success", async () => {
    const order = buildOrder();
    mockOrderFindById.mockResolvedValueOnce(order);
    const { POST } = await import("./route");
    await POST(postReq({ status: "delivered" }) as never, { params: Promise.resolve({ id: VALID_ID }) });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "order_status_changed",
        targetType: "order",
        targetId: VALID_ID,
        details: expect.objectContaining({ status: "delivered" }),
      }),
    );
  });
});
