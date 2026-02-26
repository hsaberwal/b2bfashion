"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Order = {
  id: string;
  items: { productId: string; sku: string; quantity: number; pricePerItem?: number }[];
  status: string;
  signedAt?: string;
  createdAt: string;
};

export default function CartPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ pricingApproved?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (!user) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <p className="text-gray-500">Please log in to view your orders.</p>
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
          Orders & cart
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
          <p className="text-gray-500">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">
            No orders yet. <Link href="/products" className="text-blue-600 hover:underline">Browse products</Link> and add to order (bulk only).
          </p>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-4 bg-white dark:bg-gray-900 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-sm text-gray-500">
                    Order {order.id.slice(-8)}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      order.status === "pending"
                        ? "text-amber-600"
                        : order.status === "signed"
                          ? "text-green-600"
                          : "text-gray-500"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {order.items.map((item, i) => (
                    <li key={i}>
                      {item.sku} × {item.quantity}
                      {user.pricingApproved && item.pricePerItem != null && (
                        <span className="screenshot-protected ml-2">
                          £{(item.pricePerItem * item.quantity).toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {order.status === "pending" && (
                  <Link
                    href={`/cart/${order.id}/sign`}
                    className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                  >
                    Sign order to accept →
                  </Link>
                )}
                {order.signedAt && (
                  <p className="mt-2 text-xs text-gray-500">
                    Signed at {new Date(order.signedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
