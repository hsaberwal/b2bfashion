import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Mock all the data dependencies at the module-resolution boundary.
const { mockProductCount, mockProductFind, mockUserCount, mockRequireAdmin, mockConnectDB } = vi.hoisted(() => ({
  mockProductCount: vi.fn(),
  mockProductFind: vi.fn(),
  mockUserCount: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
}));

vi.mock("@/lib/requireAdmin", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/models/Product", () => ({
  Product: {
    countDocuments: mockProductCount,
    find: mockProductFind,
  },
}));
vi.mock("@/models/User", () => ({
  User: {
    countDocuments: mockUserCount,
  },
}));

beforeEach(() => {
  mockProductCount.mockReset();
  mockProductFind.mockReset();
  mockUserCount.mockReset();
  mockRequireAdmin.mockReset().mockResolvedValue({ id: "admin1", role: "admin" });
  mockConnectDB.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetModules();
});

/**
 * The route uses Product.find({...}).select(...).sort(...).limit(...).lean()
 * — chain a stub that resolves to the desired array.
 */
function findChain(result: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
  };
}

describe("GET /api/admin/stats", () => {
  it("aggregates products, customers and low-stock items into the documented shape", async () => {
    // Order matters: route awaits Promise.all([
    //   Product.countDocuments({}),                 // total products
    //   Product.countDocuments({ disabled: true }), // hidden products
    //   User.countDocuments({ role:{$ne:'admin'}}), // total customers
    //   User.countDocuments({ role:{$ne:'admin'}, pricingApproved:{$ne:true} }), // pending pricing
    //   User.countDocuments({ emailVerified:{$ne:true} }),                       // unverified
    //   Product.find({...}).select(...).sort(...).limit(...).lean(),             // low stock items
    // ]);
    mockProductCount
      .mockResolvedValueOnce(100) // total products
      .mockResolvedValueOnce(7); // hidden products
    mockUserCount
      .mockResolvedValueOnce(42) // total customers
      .mockResolvedValueOnce(5) // pending pricing
      .mockResolvedValueOnce(3); // unverified
    mockProductFind.mockReturnValue(
      findChain([
        {
          _id: "p1",
          sku: "COL-1",
          name: "Mocha Top",
          images: ["url1.jpg", "url2.jpg"],
          packsInStock: 4,
          packsReserved: 1,
          category: "Top",
        },
        {
          _id: "p2",
          sku: "COL-2",
          name: "Forest Knit",
          images: [],
          packsInStock: 2,
          packsReserved: 2,
          category: "Knitwear",
        },
      ]),
    );

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({
      products: { total: 100, active: 93, hidden: 7 },
      customers: { total: 42, pendingPricing: 5, unverified: 3 },
      lowStock: {
        count: 2,
        items: [
          {
            id: "p1",
            sku: "COL-1",
            name: "Mocha Top",
            image: "url1.jpg",
            category: "Top",
            available: 3,
          },
          {
            id: "p2",
            sku: "COL-2",
            name: "Forest Knit",
            image: undefined,
            category: "Knitwear",
            available: 0,
          },
        ],
      },
    });
  });

  it("returns 401 when requireAdmin throws unauthorized", async () => {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    mockRequireAdmin.mockRejectedValueOnce(err);

    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when caller is not an admin", async () => {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    mockRequireAdmin.mockRejectedValueOnce(err);

    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden: admin only" });
  });

  it("returns 500 with a generic message when something else fails", async () => {
    // Suppress the route's console.error noise for this expected error
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockProductCount.mockRejectedValueOnce(new Error("db blew up"));

    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to load stats" });
    errSpy.mockRestore();
  });

  it("clamps available stock at zero when reserved exceeds physical", async () => {
    mockProductCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    mockUserCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockProductFind.mockReturnValue(
      findChain([
        {
          _id: "p1",
          sku: "X",
          name: "X",
          images: [],
          packsInStock: 1,
          packsReserved: 5, // would be -4
          category: "Top",
        },
      ]),
    );

    const { GET } = await import("./route");
    const body = await (await GET()).json();
    expect(body.lowStock.items[0].available).toBe(0);
  });

  it("calls Product.find with sort & limit so we don't pull the whole catalogue", async () => {
    mockProductCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockUserCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const chain = findChain([]);
    mockProductFind.mockReturnValue(chain);

    const { GET } = await import("./route");
    await GET();
    expect((chain.sort as Mock)).toHaveBeenCalledWith({ packsInStock: 1 });
    expect((chain.limit as Mock)).toHaveBeenCalledWith(8);
  });
});
