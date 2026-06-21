import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAgent, mockConnectDB, mockProductFindOne } = vi.hoisted(() => ({
  mockRequireAgent: vi.fn(),
  mockConnectDB: vi.fn(),
  mockProductFindOne: vi.fn(),
}));
vi.mock("@/lib/requireAdmin", () => ({ requireAgent: (...a: unknown[]) => mockRequireAgent(...a) }));
vi.mock("@/lib/mongodb", () => ({ connectDB: mockConnectDB }));
vi.mock("@/models/Product", () => ({ Product: { findOne: (...a: unknown[]) => mockProductFindOne(...a) } }));

function chain(result: unknown) {
  const c: Record<string, unknown> = { select: () => c, lean: () => Promise.resolve(result) };
  return c;
}
function req(code: string) {
  return new Request(`http://x/api/agent/products/lookup?code=${encodeURIComponent(code)}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireAgent.mockResolvedValue({ id: "ag1", role: "agent" });
  mockConnectDB.mockResolvedValue(undefined);
  vi.resetModules();
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/agent/products/lookup", () => {
  it("403s non-agents", async () => {
    mockRequireAgent.mockRejectedValueOnce(Object.assign(new Error("f"), { status: 403 }));
    const { GET } = await import("./route");
    expect((await GET(req("123") as never)).status).toBe(403);
  });

  it("400s with no code", async () => {
    const { GET } = await import("./route");
    expect((await GET(req("") as never)).status).toBe(400);
  });

  it("resolves a matching product (barcode or sku) with price", async () => {
    mockProductFindOne.mockReturnValueOnce(chain({ _id: "p1", sku: "COL-1", name: "Jumper", colour: "GREEN", packSize: 6, minPacks: 1, pricePerPiece: 14.95, packsInStock: 10, packsReserved: 2 }));
    const { GET } = await import("./route");
    const res = await GET(req("5012345678900") as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.product).toMatchObject({ id: "p1", sku: "COL-1", packSize: 6, pricePerPiece: 14.95, available: 8 });
    // matches on barcode OR sku
    const filter = mockProductFindOne.mock.calls[0][0] as { $or: unknown[] };
    expect(filter.$or).toEqual([{ barcode: "5012345678900" }, { sku: "5012345678900" }]);
  });

  it("404s when nothing matches", async () => {
    mockProductFindOne.mockReturnValueOnce(chain(null));
    const { GET } = await import("./route");
    expect((await GET(req("nope") as never)).status).toBe(404);
  });
});
