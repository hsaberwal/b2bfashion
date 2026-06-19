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
  /** Set when a pack is removed from an otherwise live order (partial cancellation). */
  cancelled?: boolean;
  /** Value credited back to the customer for a removed line. */
  creditAmount?: number;
};

/** The value of a single order line: pricePerPiece (or legacy pricePerPack) × quantity. */
export function lineValue(item: OrderItem): number {
  const piece = item.pricePerPiece ?? item.pricePerPack ?? 0;
  return piece * item.quantity;
}

/**
 * Sum of (pricePerPiece × quantity) across order items, **excluding cancelled
 * lines**. Items with no price contribute zero — useful for quoting unpriced
 * carts as 0 so the caller can surface "order has no priced items".
 *
 * Falls back to legacy pricePerPack if pricePerPiece is missing.
 */
export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => (item.cancelled ? sum : sum + lineValue(item)), 0);
}

/** Sum of credit amounts recorded against removed (cancelled) lines, rounded to pence. */
export function sumCredited(items: OrderItem[]): number {
  const raw = items.reduce((sum, item) => (item.cancelled ? sum + (item.creditAmount ?? 0) : sum), 0);
  return Math.round(raw * 100) / 100;
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

export type PaymentRecord = { amount: number; refunded?: boolean };

/**
 * Sum of non-refunded payments for an order. Rounded to whole pence to
 * avoid floating-point drift when comparing against an order total.
 */
export function sumPayments(payments: PaymentRecord[]): number {
  const raw = payments
    .filter((p) => !p.refunded)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  return Math.round(raw * 100) / 100;
}

/**
 * Remaining balance on an order. Clamped at zero (never negative) so
 * over-payment doesn't display as "minus £x outstanding" — refunds
 * should be tracked separately.
 */
export function calculateOutstanding(orderTotal: number, paid: number): number {
  const diff = Math.round((orderTotal - paid) * 100) / 100;
  return diff > 0 ? diff : 0;
}
