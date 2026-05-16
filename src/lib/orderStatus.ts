/**
 * Order fulfilment lifecycle. The same string lives on Order.status
 * and is rendered to both admins (where they can advance it) and
 * customers (where they see read-only progress).
 */

export type OrderStatus =
  | "pending"
  | "signed"
  | "confirmed"
  | "picked"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

export const FULFILMENT_STEPS: OrderStatus[] = [
  "signed",
  "confirmed",
  "picked",
  "ready_to_ship",
  "shipped",
  "delivered",
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Cart",
  signed: "Signed — awaiting payment",
  confirmed: "Confirmed",
  picked: "Picked",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Shorter label suitable for table cells / chips. */
export const STATUS_SHORT_LABEL: Record<OrderStatus, string> = {
  pending: "Cart",
  signed: "Signed",
  confirmed: "Confirmed",
  picked: "Picked",
  ready_to_ship: "Ready",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STEP_INDEX: Record<OrderStatus, number> = {
  pending: -1,
  signed: 0,
  confirmed: 1,
  picked: 2,
  ready_to_ship: 3,
  shipped: 4,
  delivered: 5,
  cancelled: -1,
};

/**
 * Status the admin can transition the order TO next, given the current
 * status. Returns null at the end of the chain or when cancelled.
 */
export function nextStatus(current: OrderStatus): OrderStatus | null {
  if (current === "cancelled" || current === "delivered" || current === "pending") return null;
  const i = STEP_INDEX[current];
  const next = FULFILMENT_STEPS[i + 1];
  return next ?? null;
}

/** Is `target` past `current` in the fulfilment chain? */
export function isAfter(current: OrderStatus, target: OrderStatus): boolean {
  return STEP_INDEX[current] > STEP_INDEX[target];
}

/** Is `target` reached or passed by `current`? */
export function isAtOrAfter(current: OrderStatus, target: OrderStatus): boolean {
  return STEP_INDEX[current] >= STEP_INDEX[target];
}
