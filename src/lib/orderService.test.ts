import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const { mockProductFindById } = vi.hoisted(() => ({ mockProductFindById: vi.fn() }));
vi.mock("@/models/Product", () => ({ Product: { findById: (...a: unknown[]) => mockProductFindById(...a) } }));

const PID = "507f1f77bcf86cd799439011";
function product(over: Record<string, unknown> = {}) {
  return { _id: new mongoose.Types.ObjectId(PID), sku: "COL-1", packSize: 6, minPacks: 1, pricePerPiece: 10, ...over };
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("buildOrderLines", () => {
  it("builds a priced line when canPrice is true", async () => {
    mockProductFindById.mockResolvedValueOnce(product());
    const { buildOrderLines } = await import("./orderService");
    const lines = await buildOrderLines([{ productId: PID, quantity: 12 }], { canPrice: true });
    expect(lines[0]).toMatchObject({ sku: "COL-1", quantity: 12, pricePerPiece: 10, packSize: 6 });
  });

  it("omits price when canPrice is false", async () => {
    mockProductFindById.mockResolvedValueOnce(product());
    const { buildOrderLines } = await import("./orderService");
    const lines = await buildOrderLines([{ productId: PID, quantity: 6 }], { canPrice: false });
    expect(lines[0].pricePerPiece).toBeUndefined();
  });

  it("rejects a quantity that isn't a pack multiple", async () => {
    mockProductFindById.mockResolvedValueOnce(product());
    const { buildOrderLines } = await import("./orderService");
    await expect(buildOrderLines([{ productId: PID, quantity: 7 }], { canPrice: true })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects below the minimum packs", async () => {
    mockProductFindById.mockResolvedValueOnce(product({ minPacks: 3 }));
    const { buildOrderLines } = await import("./orderService");
    await expect(buildOrderLines([{ productId: PID, quantity: 6 }], { canPrice: true })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an unknown product", async () => {
    mockProductFindById.mockResolvedValueOnce(null);
    const { buildOrderLines } = await import("./orderService");
    await expect(buildOrderLines([{ productId: PID, quantity: 6 }], { canPrice: true })).rejects.toMatchObject({ status: 400 });
  });
});
