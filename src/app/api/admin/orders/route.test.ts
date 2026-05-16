import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAdmin, mockConnectDB, mockOrderFind, mockPaymentFind, mockUserFind } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockOrderFind: vi.fn(),
  mockPaymentFind: vi.fn(),
  mockUserFind: vi.fn(),
}));

vi.mock("@/lib/requireAdmin", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/models/Order", () => ({
  Order: { find: (...a: unknown[]) => mockOrderFind(...a) },
}));
vi.mock("@/models/Payment", () => ({
  Payment: { find: (...a: unknown[]) => mockPaymentFind(...a) },
}));
vi.mock("@/models/User", () => ({
  User: { find: (...a: unknown[]) => mockUserFind(...a) },
}));

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockConnectDB.mockReset();
  mockOrderFind.mockReset();
  mockPaymentFind.mockReset();
  mockUserFind.mockReset();
  mockRequireAdmin.mockResolvedValue({ id: "admin1", email: "admin@example.com", role: "admin" });
  mockConnectDB.mockResolvedValue(undefined);
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeChainable(result: unknown) {
  // Chainable mongoose query — supports .sort().limit().lean() and friends.
  const chain: Record<string, unknown> = {
    sort: () => chain,
    limit: () => chain,
    select: () => chain,
    lean: () => Promise.resolve(result),
  };
  return chain;
}

function req(url: string) {
  return new Request(url);
}

describe("GET /api/admin/orders", () => {
  it("returns 401 when not authenticated", async () => {
    const err = Object.assign(new Error("Unauthorized"), { status: 401 });
    mockRequireAdmin.mockRejectedValueOnce(err);
    const { GET } = await import("./route");
    const res = await GET(req("http://x/api/admin/orders") as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    const err = Object.assign(new Error("Forbidden"), { status: 403 });
    mockRequireAdmin.mockRejectedValueOnce(err);
    const { GET } = await import("./route");
    const res = await GET(req("http://x/api/admin/orders") as never);
    expect(res.status).toBe(403);
  });

  it("excludes pending carts by default and computes paid/outstanding per order", async () => {
    mockOrderFind.mockReturnValueOnce(
      makeChainable([
        {
          _id: "order_aaaaaaaa1",
          userId: "user1",
          status: "confirmed",
          paymentStatus: "paid",
          paymentOption: "pay_now",
          items: [{ pricePerPiece: 10, quantity: 4 }],
          createdAt: new Date("2026-05-01"),
          signedAt: new Date("2026-05-01"),
        },
        {
          _id: "order_bbbbbbbb2",
          userId: "user2",
          status: "signed",
          paymentStatus: "none",
          paymentOption: "pay_later",
          items: [{ pricePerPiece: 25, quantity: 2 }],
          createdAt: new Date("2026-05-02"),
          signedAt: new Date("2026-05-02"),
        },
      ]),
    );
    mockPaymentFind.mockReturnValueOnce({
      lean: () => Promise.resolve([
        { orderId: "order_aaaaaaaa1", amount: 40 },
        { orderId: "order_bbbbbbbb2", amount: 10 },
      ]),
    });
    mockUserFind.mockReturnValueOnce({
      select: () => ({ lean: () => Promise.resolve([
        { _id: "user1", email: "a@a.com", name: "Alice" },
        { _id: "user2", email: "b@b.com", name: "Bob", companyName: "Bob Co" },
      ]) }),
    });

    const { GET } = await import("./route");
    const res = await GET(req("http://x/api/admin/orders") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orders).toHaveLength(2);
    expect(data.orders[0]).toMatchObject({
      shortCode: "aaaaaaaa1".slice(-8),
      total: 40,
      paid: 40,
      outstanding: 0,
      customer: { email: "a@a.com" },
    });
    expect(data.orders[1]).toMatchObject({
      total: 50,
      paid: 10,
      outstanding: 40,
      customer: { email: "b@b.com", companyName: "Bob Co" },
    });

    // First call: Order.find — filter should have status != "pending"
    const orderCallArgs = mockOrderFind.mock.calls[0][0];
    expect(orderCallArgs.status).toEqual({ $ne: "pending" });
  });

  it("applies status filter from comma-separated query param", async () => {
    mockOrderFind.mockReturnValueOnce(makeChainable([]));
    mockPaymentFind.mockReturnValueOnce({ lean: () => Promise.resolve([]) });
    mockUserFind.mockReturnValueOnce({ select: () => ({ lean: () => Promise.resolve([]) }) });

    const { GET } = await import("./route");
    await GET(req("http://x/api/admin/orders?status=signed,confirmed") as never);
    const filter = mockOrderFind.mock.calls[0][0];
    expect(filter.status).toEqual({ $in: ["signed", "confirmed"] });
  });

  it("includes pending carts when includeCart=true", async () => {
    mockOrderFind.mockReturnValueOnce(makeChainable([]));
    mockPaymentFind.mockReturnValueOnce({ lean: () => Promise.resolve([]) });
    mockUserFind.mockReturnValueOnce({ select: () => ({ lean: () => Promise.resolve([]) }) });

    const { GET } = await import("./route");
    await GET(req("http://x/api/admin/orders?includeCart=true") as never);
    const filter = mockOrderFind.mock.calls[0][0];
    expect(filter.status).toBeUndefined();
  });

  it("looks up users by free-text q and ORs user/SKU match into the filter", async () => {
    // Free-text matches a user
    mockUserFind
      .mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([{ _id: "u_match" }]) }),
      })
      .mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      });
    mockOrderFind.mockReturnValueOnce(makeChainable([]));
    mockPaymentFind.mockReturnValueOnce({ lean: () => Promise.resolve([]) });

    const { GET } = await import("./route");
    await GET(req("http://x/api/admin/orders?q=acme") as never);
    const filter = mockOrderFind.mock.calls[0][0];
    expect(filter.$or).toBeDefined();
    expect(Array.isArray(filter.$or)).toBe(true);
    // Should include both userId filter (because users matched) and items.sku filter
    expect(filter.$or.some((c: Record<string, unknown>) => c.userId)).toBe(true);
    expect(filter.$or.some((c: Record<string, unknown>) => c["items.sku"])).toBe(true);
  });

  it("falls back to SKU-only $or when q matches no users", async () => {
    mockUserFind
      .mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      })
      .mockReturnValueOnce({
        select: () => ({ lean: () => Promise.resolve([]) }),
      });
    mockOrderFind.mockReturnValueOnce(makeChainable([]));
    mockPaymentFind.mockReturnValueOnce({ lean: () => Promise.resolve([]) });

    const { GET } = await import("./route");
    await GET(req("http://x/api/admin/orders?q=nobody") as never);
    const filter = mockOrderFind.mock.calls[0][0];
    expect(filter.$or).toHaveLength(1);
    expect(filter.$or[0]["items.sku"]).toBeDefined();
  });

  it("applies date range filters", async () => {
    mockOrderFind.mockReturnValueOnce(makeChainable([]));
    mockPaymentFind.mockReturnValueOnce({ lean: () => Promise.resolve([]) });
    mockUserFind.mockReturnValueOnce({ select: () => ({ lean: () => Promise.resolve([]) }) });

    const { GET } = await import("./route");
    await GET(req("http://x/api/admin/orders?from=2026-01-01&to=2026-12-31") as never);
    const filter = mockOrderFind.mock.calls[0][0];
    expect(filter.createdAt.$gte).toEqual(new Date("2026-01-01"));
    expect(filter.createdAt.$lte).toEqual(new Date("2026-12-31"));
  });

  it("excludes refunded payments from the paid total", async () => {
    mockOrderFind.mockReturnValueOnce(
      makeChainable([
        {
          _id: "o1",
          userId: "u1",
          status: "confirmed",
          paymentStatus: "paid",
          paymentOption: "pay_now",
          items: [{ pricePerPiece: 10, quantity: 10 }],
          createdAt: new Date(),
        },
      ]),
    );
    mockPaymentFind.mockReturnValueOnce({
      lean: () => Promise.resolve([
        { orderId: "o1", amount: 100 },
        { orderId: "o1", amount: 50, refunded: true },
      ]),
    });
    mockUserFind.mockReturnValueOnce({ select: () => ({ lean: () => Promise.resolve([{ _id: "u1", email: "x@x.com" }]) }) });

    const { GET } = await import("./route");
    const res = await GET(req("http://x/api/admin/orders") as never);
    const data = await res.json();
    expect(data.orders[0].paid).toBe(100);
    expect(data.orders[0].outstanding).toBe(0);
  });
});
