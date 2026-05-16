/**
 * Guest cart — stored in localStorage for unauthenticated users.
 * Merged into server cart after login/registration.
 */

export type GuestCartItem = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  packSize: number;
  size?: string;
  pricePerPiece?: number;
  image?: string;
};

const STORAGE_KEY = "claudia_guest_cart";
export const CART_UPDATED_EVENT = "cart:updated";

/**
 * Notify any in-page listener (e.g. the Navbar count badge) that the
 * cart changed. The native `storage` event only fires across tabs, so
 * we need a same-tab signal too.
 */
export function dispatchCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setGuestCart(items: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  dispatchCartUpdated();
}

export function addToGuestCart(item: GuestCartItem) {
  const cart = getGuestCart();
  const key = `${item.productId}:${item.size ?? ""}`;
  const existing = cart.find((i) => `${i.productId}:${i.size ?? ""}` === key);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  setGuestCart(cart);
}

export function removeFromGuestCart(productId: string, size?: string) {
  const cart = getGuestCart();
  const key = `${productId}:${size ?? ""}`;
  setGuestCart(cart.filter((i) => `${i.productId}:${i.size ?? ""}` !== key));
}

export function clearGuestCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  dispatchCartUpdated();
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((sum, i) => sum + i.quantity, 0);
}
