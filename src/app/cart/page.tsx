"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type OrderItem = {
  productId: string;
  sku: string;
  quantity: number;
  pricePerItem?: number;
  packSize?: number;
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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ pricingApproved?: boolean } | null>(null);
  const [updating, setUpdating] = useState(false);

  function loadOrders() {
    return fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        setCart(d.cart ?? null);
        setOrders(d.orders ?? []);
      });
  }

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, []);

  async function updateQuantity(orderId: string, items: OrderItem[]) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
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

  function removeLine(orderId: string, currentItems: OrderItem[], productId: string) {
    const next = currentItems.filter((i) => i.productId !== productId);
    if (next.length === 0) {
      updateQuantity(orderId, []).then(() => setCart(null));
      return;
    }
    updateQuantity(orderId, next);
  }

  const pastOrders = orders.filter((o) => o.status !== "pending");

  if (!user) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <p className="text-gray-500">Please log in to view your cart.</p>
        <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline">
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cart & orders
        </h1>
        <Link
          href="/products"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Continue shopping
        </Link>
      </header>
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            {/* Single cart */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Your cart
              </h2>
              {!cart || cart.items.length === 0 ? (
                <p className="text-gray-500">
                  Your cart is empty. <Link href="/products" className="text-blue-600 hover:underline">Browse products</Link> and add to cart (bulk only).
                </p>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-white dark:bg-gray-900 dark:border-gray-800">
                  <ul className="space-y-3">
                    {cart.items.map((item) => (
                      <li
                        key={item.productId}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                            {item.sku}
                          </span>
                          {user.pricingApproved && item.pricePerItem != null && (
                            <span className="screenshot-protected ml-2 text-sm text-gray-600 dark:text-gray-400">
                              £{(item.pricePerItem * item.quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-sm">
                            <span className="text-gray-500">Qty:</span>
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
                                          x.productId === item.productId ? { ...x, quantity: q } : x
                                        ),
                                      }
                                    : null
                                );
                              }}
                              onBlur={() => updateQuantity(cart.id, cart.items)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeLine(cart.id, cart.items, item.productId)}
                            disabled={updating}
                            className="text-sm text-red-600 hover:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/cart/${cart.id}/sign`}
                    className="mt-4 inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                  >
                    Sign order to accept →
                  </Link>
                </div>
              )}
            </section>

            {/* Past orders */}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Past orders
                </h2>
                <div className="space-y-4">
                  {pastOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-4 bg-white dark:bg-gray-900 dark:border-gray-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-sm text-gray-500">
                          Order {order.id.slice(-8)}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            order.status === "signed" ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {order.items.map((item) => (
                          <li key={item.productId}>
                            {item.sku} × {item.quantity}
                            {user.pricingApproved && item.pricePerItem != null && (
                              <span className="screenshot-protected ml-2">
                                £{(item.pricePerItem * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {order.signedAt && (
                        <p className="mt-2 text-xs text-gray-500">
                          Signed at {new Date(order.signedAt).toLocaleString()}
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
