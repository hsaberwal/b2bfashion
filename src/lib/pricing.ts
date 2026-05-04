/**
 * Pure pricing helpers. Money values are in GBP as decimal numbers
 * (e.g. 29.99 = £29.99); call sites that talk to Stripe convert to
 * minor units there.
 */

export type OrderItem = {
  pricePerPiece?: number;
  /** Legacy field still present on some old order items. */
  pricePerPack?: number;
  quantity: number;
};

/**
 * Sum of (pricePerPiece × quantity) across order items. Items with no
 * price contribute zero — useful for quoting unpriced carts as 0 so
 * the caller can surface "order has no priced items".
 *
 * Falls back to legacy pricePerPack if pricePerPiece is missing.
 */
export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    const piece = item.pricePerPiece ?? item.pricePerPack ?? 0;
    return sum + piece * item.quantity;
  }, 0);
}

/**
 * 10% deposit, rounded to whole pence. Always 0.1 × total — matches
 * the (orderTotal × 0.1 × 100) / 100 pattern used by the pay endpoint.
 */
export function calculateDeposit(orderTotal: number): number {
  return Math.round(orderTotal * 0.1 * 100) / 100;
}

/**
 * Pack price for display = pricePerPiece × items per pack. Returns
 * null when either input is missing/non-positive — callers render a
 * "no price yet" hint instead.
 */
export function calculatePackPrice(
  pricePerPiece: number | null | undefined,
  itemsPerPack: number | null | undefined,
): number | null {
  if (pricePerPiece == null || itemsPerPack == null) return null;
  if (!Number.isFinite(pricePerPiece) || pricePerPiece <= 0) return null;
  if (!Number.isFinite(itemsPerPack) || itemsPerPack <= 0) return null;
  return pricePerPiece * itemsPerPack;
}
