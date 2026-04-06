"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getGuestCart, setGuestCart, clearGuestCart, type GuestCartItem } from "@/lib/guestCart";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

type OrderItem = {
  productId: string;
  sku: string;
  quantity: number;
  pricePerItem?: number;
  packSize?: number;
  size?: string;
};

type Order = {
  id: string;
  items: OrderItem[];
  status: string;
  signedAt?: string;
  createdAt: string;
};

export default function CartPage() {
  const [cart, setCart] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ pricingApproved?: boolean } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [merging, setMerging] = useState(false);

  function loadOrders() {
    return fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        setCart(d.cart ?? null);
        setOrders(d.orders ?? []);
      });
  }

  // Check auth and load cart
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setIsLoggedIn(!!d.user);
      });
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      // Logged in — merge guest cart if any, then load server cart
      const guest = getGuestCart();
      if (guest.length > 0) {
        setMerging(true);
        mergeGuestCart(guest)
          .then(() => clearGuestCart())
          .then(() => loadOrders())
          .finally(() => { setMerging(false); setLoading(false); });
      } else {
        loadOrders().finally(() => setLoading(false));
      }
    } else {
      // Not logged in — show guest cart from localStorage
      setGuestItems(getGuestCart());
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  /** Merge guest cart items into server cart */
  async function mergeGuestCart(items: GuestCartItem[]) {
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            ...(i.size ? { size: i.size } : {}),
          })),
        }),
      });
    } catch {
      // If merge fails, keep guest cart for next attempt
    }
  }

  async function updateQuantity(orderId: string, items: OrderItem[]) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, ...(i.size != null ? { size: i.size } : {}) })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Update failed");
        return;
      }
      const data = await res.json();
      setCart(data);
      await loadOrders();
    } finally {
      setUpdating(false);
    }
  }

  function removeLine(orderId: string, currentItems: OrderItem[], productId: string, size?: string) {
    const next = currentItems.filter((i) => i.productId !== productId || (i.size ?? "") !== (size ?? ""));
    if (next.length === 0) {
      updateQuantity(orderId, []).then(() => setCart(null));
      return;
    }
    updateQuantity(orderId, next);
  }

  function removeGuestItem(productId: string, size?: string) {
    const key = `${productId}:${size ?? ""}`;
    const updated = guestItems.filter((i) => `${i.productId}:${i.size ?? ""}` !== key);
    setGuestItems(updated);
    setGuestCart(updated);
  }

  function updateGuestQuantity(productId: string, size: string | undefined, quantity: number) {
    const updated = guestItems.map((i) => {
      if (i.productId === productId && (i.size ?? "") === (size ?? "")) {
        return { ...i, quantity };
      }
      return i;
    });
    setGuestItems(updated);
    setGuestCart(updated);
  }

  const pastOrders = orders.filter((o) => o.status !== "pending");
  const hasGuestItems = guestItems.length > 0;
  const hasServerCart = cart && cart.items.length > 0;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-white">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl text-je-black">
          {isLoggedIn ? "Cart & Orders" : "Your Cart"}
        </h1>
        <div className="flex gap-2">
          {isLoggedIn && (
            <Link
              href="/account"
              className="px-4 py-2 border border-je-border text-je-black text-[11px] uppercase tracking-widest hover:bg-je-offwhite transition-colors"
            >
              Account
            </Link>
          )}
          <Link
            href="/products"
            className="px-4 py-2 border border-je-border text-je-black text-[11px] uppercase tracking-widest hover:bg-je-offwhite transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        {loading || merging ? (
          <p className="text-je-muted">{merging ? "Transferring your cart..." : "Loading..."}</p>
        ) : (
          <>
            {/* Guest cart (not logged in) */}
            {!isLoggedIn && (
              <section className="mb-8">
                {!hasGuestItems ? (
                  <div className="text-center py-16">
                    <p className="text-je-muted mb-4">
                      Your cart is empty.
                    </p>
                    <Link href="/products" className="btn-primary">
                      Browse Garments
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="border border-je-border bg-je-offwhite">
                      <ul className="divide-y divide-je-border">
                        {guestItems.map((item) => (
                          <li
                            key={`${item.productId}:${item.size ?? ""}`}
                            className="flex items-center gap-4 p-4"
                          >
                            {/* Thumbnail */}
                            {item.image && (
                              <div className="w-16 h-20 shrink-0 bg-je-cream overflow-hidden">
                                <img
                                  src={imageDisplayUrl(item.image)}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-je-black truncate">{item.name}</p>
                              <p className="text-xs text-je-muted">
                                {item.sku}
                                {item.size && <span> &middot; {item.size}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min={item.packSize}
                                step={item.packSize}
                                value={item.quantity}
                                onChange={(e) => {
                                  const raw = Number(e.target.value);
                                  const q = Math.max(item.packSize, Math.floor(raw / item.packSize) * item.packSize);
                                  updateGuestQuantity(item.productId, item.size, q);
                                }}
                                className="w-20 px-2 py-1 border border-je-border text-center text-sm text-je-black"
                              />
                              <button
                                type="button"
                                onClick={() => removeGuestItem(item.productId, item.size)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Prompt to register/login */}
                    <div className="mt-6 p-6 border border-je-border bg-je-cream text-center">
                      <p className="text-sm text-je-black mb-1 font-medium">
                        Ready to order?
                      </p>
                      <p className="text-xs text-je-muted mb-4">
                        Log in or create an account to complete your wholesale order. Your cart will be saved.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <Link href="/login" className="btn-primary">
                          Log In
                        </Link>
                        <Link href="/register" className="btn-outline">
                          Create Account
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Logged-in cart */}
            {isLoggedIn && (
              <section className="mb-8">
                <h2 className="text-[11px] uppercase tracking-widest font-semibold text-je-black mb-4">
                  Your Cart
                </h2>
                {!hasServerCart ? (
                  <p className="text-je-muted">
                    Your cart is empty. <Link href="/products" className="text-je-black font-medium underline hover:no-underline">Browse garments</Link>
                  </p>
                ) : (
                  <div className="border border-je-border bg-je-offwhite">
                    <ul className="divide-y divide-je-border">
                      {cart.items.map((item) => (
                        <li
                          key={`${item.productId}:${item.size ?? ""}`}
                          className="flex flex-wrap items-center justify-between gap-2 p-4"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-je-black">
                              {item.sku}
                              {item.size != null && item.size !== "" && (
                                <span className="ml-2 text-je-muted">· {item.size}</span>
                              )}
                            </span>
                            {user?.pricingApproved && item.pricePerItem != null && (
                              <span className="screenshot-protected ml-3 text-sm text-je-charcoal font-medium">
                                £{(item.pricePerItem * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={item.packSize ?? 1}
                              step={item.packSize ?? 1}
                              value={item.quantity}
                              disabled={updating}
                              onChange={(e) => {
                                const raw = Number(e.target.value);
                                const step = item.packSize ?? 1;
                                const q = Math.max(step, Math.floor(raw / step) * step);
                                setCart((c) =>
                                  c
                                    ? {
                                        ...c,
                                        items: c.items.map((x) =>
                                          x.productId === item.productId && (x.size ?? "") === (item.size ?? "") ? { ...x, quantity: q } : x
                                        ),
                                      }
                                    : null
                                );
                              }}
                              onBlur={() => updateQuantity(cart.id, cart.items)}
                              className="w-20 px-2 py-1 border border-je-border text-center text-sm text-je-black"
                            />
                            <button
                              type="button"
                              onClick={() => removeLine(cart.id, cart.items, item.productId, item.size)}
                              disabled={updating}
                              className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="p-4 border-t border-je-border">
                      <Link
                        href={`/cart/${cart.id}/sign`}
                        className="btn-primary"
                      >
                        Proceed to Checkout
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Past orders (logged in only) */}
            {isLoggedIn && pastOrders.length > 0 && (
              <section>
                <h2 className="text-[11px] uppercase tracking-widest font-semibold text-je-black mb-4">
                  Past Orders
                </h2>
                <div className="space-y-4">
                  {pastOrders.map((order) => (
                    <div key={order.id} className="border border-je-border p-4 bg-je-offwhite">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs text-je-muted">
                          Order {order.id.slice(-8)}
                        </span>
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider ${
                            order.status === "signed" || order.status === "confirmed"
                              ? "text-green-700"
                              : "text-je-muted"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <ul className="space-y-1 text-sm text-je-charcoal">
                        {order.items.map((item) => (
                          <li key={`${item.productId}:${item.size ?? ""}`}>
                            {item.sku}
                            {item.size != null && item.size !== "" ? ` · ${item.size}` : ""} &times; {item.quantity}
                            {user?.pricingApproved && item.pricePerItem != null && (
                              <span className="screenshot-protected ml-2">
                                £{(item.pricePerItem * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {order.signedAt && (
                        <p className="mt-2 text-xs text-je-muted">
                          Signed {new Date(order.signedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
