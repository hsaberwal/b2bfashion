"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { STATUS_SHORT_LABEL, type OrderStatus } from "@/lib/orderStatus";

type AdminOrder = {
  id: string;
  shortCode: string;
  createdAt: string;
  signedAt?: string;
  shippedAt?: string;
  status: OrderStatus;
  paymentStatus: "none" | "pending" | "paid" | "failed" | "refunded";
  paymentOption: "pay_now" | "pay_deposit" | "pay_later";
  itemCount: number;
  unitCount: number;
  total: number;
  paid: number;
  outstanding: number;
  customer: { id: string; email: string; name?: string; companyName?: string } | null;
};

type StatusFilter = "all" | "new" | "active" | "outstanding" | "complete";

const STATUS_BUCKETS: Record<StatusFilter, OrderStatus[] | null> = {
  all: null,
  new: ["signed", "confirmed"],
  active: ["confirmed", "picked", "ready_to_ship"],
  outstanding: ["signed", "confirmed", "picked", "ready_to_ship", "shipped"],
  complete: ["delivered"],
};

function fmtGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function isNewToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function paymentLabel(opt: AdminOrder["paymentOption"], status: AdminOrder["paymentStatus"], outstanding: number) {
  if (status === "refunded") return { label: "Refunded", tone: "muted" } as const;
  if (status === "failed") return { label: "Payment failed", tone: "danger" } as const;
  if (opt === "pay_later") return { label: outstanding > 0 ? "On credit" : "Credit — paid", tone: outstanding > 0 ? "warn" : "ok" } as const;
  if (opt === "pay_deposit") return { label: outstanding > 0 ? "Deposit paid" : "Paid in full", tone: outstanding > 0 ? "warn" : "ok" } as const;
  if (opt === "pay_now") return { label: status === "paid" ? "Paid in full" : status === "pending" ? "Awaiting Stripe" : "Unpaid", tone: status === "paid" ? "ok" : "warn" } as const;
  return { label: opt, tone: "muted" } as const;
}

const TONE_CLASS: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  muted: "bg-gray-100 text-gray-700",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const bucket = STATUS_BUCKETS[filter];
    if (bucket) params.set("status", bucket.join(","));
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/admin/orders?${params}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  const counts = useMemo(() => ({
    newToday: orders.filter((o) => isNewToday(o.signedAt ?? o.createdAt)).length,
    outstanding: orders.filter((o) => o.outstanding > 0 && o.status !== "cancelled" && o.status !== "delivered").length,
    totalOutstanding: orders
      .filter((o) => o.outstanding > 0 && o.status !== "cancelled")
      .reduce((sum, o) => sum + o.outstanding, 0),
  }), [orders]);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? "Loading…" : `${orders.length} order${orders.length === 1 ? "" : "s"} shown`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, email, company, SKU…"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64"
            />
          </div>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <SummaryCard label="New today" value={counts.newToday} tone="info" />
          <SummaryCard label="With outstanding balance" value={counts.outstanding} tone="warn" />
          <SummaryCard label="Total outstanding" value={fmtGBP(counts.totalOutstanding)} tone="warn" />
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(STATUS_BUCKETS) as StatusFilter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
                filter === k
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {k === "all" ? "All" : k === "new" ? "New" : k === "active" ? "In fulfilment" : k === "outstanding" ? "Outstanding" : "Complete"}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <p className="p-8 text-sm text-gray-500">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="p-8 text-sm text-gray-500">No orders match the current filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Order</th>
                    <th className="text-left px-4 py-3 font-semibold">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Payment</th>
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                    <th className="text-right px-4 py-3 font-semibold">Paid</th>
                    <th className="text-right px-4 py-3 font-semibold">Outstanding</th>
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => {
                    const pay = paymentLabel(o.paymentOption, o.paymentStatus, o.outstanding);
                    return (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            #{o.shortCode}
                          </Link>
                          {isNewToday(o.signedAt ?? o.createdAt) && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-blue-100 text-blue-800 rounded">New</span>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {o.itemCount} line{o.itemCount === 1 ? "" : "s"} · {o.unitCount} pcs
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {o.customer ? (
                            <>
                              <p className="text-gray-900">{o.customer.name || o.customer.email}</p>
                              {o.customer.companyName && (
                                <p className="text-xs text-gray-500">{o.customer.companyName}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {STATUS_SHORT_LABEL[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${TONE_CLASS[pay.tone]}`}>
                            {pay.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">{fmtGBP(o.total)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmtGBP(o.paid)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${o.outstanding > 0 ? "text-amber-700" : "text-gray-400"}`}>
                          {o.outstanding > 0 ? fmtGBP(o.outstanding) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {fmtDate(o.signedAt ?? o.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number | string; tone: "info" | "warn" }) {
  const ring = tone === "warn" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50";
  const dot = tone === "warn" ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className={`rounded-lg border p-4 ${ring}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <p className="text-xs font-medium text-gray-700">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
