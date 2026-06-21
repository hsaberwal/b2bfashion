import mongoose from "mongoose";
import { Product } from "@/models/Product";

/**
 * Shared order-building / stock helpers used by the agent portal. These mirror
 * the customer checkout logic in `api/orders/route.ts` (build), `…/sign` (reserve)
 * and `…/pay` (pay_later consume). They are intentionally isolated here so the
 * live customer routes are untouched; unify later if desired.
 */

export type IncomingItem = { productId: string; quantity: number };

export type OrderLine = {
  productId: mongoose.Types.ObjectId;
  sku: string;
  quantity: number;
  pricePerPiece?: number;
  packSize: number;
};

/** A `.status`-tagged error so route catch-blocks reuse the 400/409 pattern. */
function fail(message: string, status = 400): never {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  throw err;
}

/**
 * Validate incoming items against their products (pack-size multiple + minimum
 * packs) and return order lines. `canPrice` stamps `pricePerPiece` (agents and
 * admins always can). Throws a 400-tagged error on any invalid line.
 */
export async function buildOrderLines(items: IncomingItem[], opts: { canPrice: boolean }): Promise<OrderLine[]> {
  const lines: OrderLine[] = [];
  for (const item of items) {
    if (!mongoose.Types.ObjectId.isValid(item.productId)) fail(`Invalid product: ${item.productId}`);
    const product = await Product.findById(item.productId);
    if (!product) fail(`Product not found: ${item.productId}`);
    if (item.quantity % product.packSize !== 0) {
      fail(`Quantity for ${product.sku} must be a multiple of pack size ${product.packSize}`);
    }
    const minPacks = product.minPacks ?? 1;
    const minQty = product.packSize * minPacks;
    if (item.quantity < minQty) {
      fail(`Minimum order for ${product.sku} is ${minPacks} pack${minPacks > 1 ? "s" : ""} (${minQty} items)`);
    }
    lines.push({
      productId: product._id,
      sku: product.sku,
      quantity: item.quantity,
      pricePerPiece: opts.canPrice ? (product.pricePerPiece ?? product.pricePerPack) : undefined,
      packSize: product.packSize,
    });
  }
  return lines;
}

type StockItem = { productId: mongoose.Types.ObjectId | unknown; quantity: number; packSize?: number };

/**
 * Atomically reserve stock for each line (packsReserved += packs). Rolls back
 * everything and returns an error string if any line lacks available stock.
 */
export async function reserveStock(items: StockItem[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const reserved: { productId: unknown; packs: number }[] = [];
  const rollback = async () => {
    for (const r of reserved) {
      await Product.updateOne({ _id: r.productId }, { $inc: { packsReserved: -r.packs } }).catch(() => {});
    }
  };
  for (const item of items) {
    const packs = Math.floor(item.quantity / (item.packSize ?? 1));
    if (packs <= 0) continue;
    const result = await Product.updateOne(
      {
        _id: item.productId,
        $expr: { $gte: [{ $subtract: [{ $ifNull: ["$packsInStock", 0] }, { $ifNull: ["$packsReserved", 0] }] }, packs] },
      },
      { $inc: { packsReserved: packs } }
    );
    if (result.matchedCount === 0) {
      await rollback();
      const product = await Product.findById(item.productId).select("name sku packsInStock packsReserved");
      const available = Math.max(0, ((product?.packsInStock as number) ?? 0) - ((product?.packsReserved as number) ?? 0));
      return { ok: false, error: `Not enough stock for ${product?.sku ?? "item"}. Only ${available} pack${available !== 1 ? "s" : ""} available.` };
    }
    reserved.push({ productId: item.productId, packs });
  }
  return { ok: true };
}

/** Release a prior reservation (packsReserved -= packs) — used when a save fails after reserving. */
export async function releaseReservation(items: StockItem[]): Promise<void> {
  for (const item of items) {
    const packs = Math.floor(item.quantity / (item.packSize ?? 1));
    if (packs > 0) {
      await Product.updateOne({ _id: item.productId }, { $inc: { packsReserved: -packs } }).catch(() => {});
    }
  }
}

/** Consume reserved stock for an invoice/pay_later order (packsInStock -= packs, packsReserved -= packs). */
export async function consumePayLaterStock(items: StockItem[]): Promise<void> {
  for (const item of items) {
    const packs = Math.floor(item.quantity / (item.packSize ?? 1));
    if (packs > 0) {
      await Product.updateOne({ _id: item.productId }, { $inc: { packsInStock: -packs, packsReserved: -packs } }).catch(() => {});
    }
  }
}
