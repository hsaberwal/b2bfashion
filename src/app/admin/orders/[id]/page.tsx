"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";
import { STATUS_LABEL, nextStatus, type OrderStatus } from "@/lib/orderStatus";

type OrderItem = {
  productId: string;
  sku: string;
  productName: string;
  colour?: string;
  category?: string;
  sizes?: string[];
  sizeRatio?: number[];
  image?: string;
  size?: string;
  quantity: number;
  packSize: number;
  packs: number | null;
  pricePerPiece?: number;
  lineTotal: number;
};

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  refunded: boolean;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  shortCode: string;
  createdAt: string;
  signedAt?: string;
  pickedAt?: string;
  readyAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentOption: "pay_now" | "pay_deposit" | "pay_later";
  depositAmount?: number;
  depositPaid?: boolean;
  shippingCarrier?: string;
  shippingTrackingNumber?: string;
  deliverySnapshot?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    country?: string;
    vatNumber?: string;
    companyName?: string;
  } | null;
  items: OrderItem[];
  total: number;
  paid: number;
  outstanding: number;
  payments: PaymentRow[];
  customer: { id: string; email: string; name?: string; companyName?: string; vatNumber?: string } | null;
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  stripe: "Stripe",
  other: "Other",
};

function fmtGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

function fmtDateTime(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-GB");
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bank_transfer" | "cheque" | "stripe" | "other">("bank_transfer");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");

  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/orders/${id}`);
      if (!r.ok) {
        setOrder(null);
        return;
      }
      const data = (await r.json()) as OrderDetail;
      setOrder(data);
      setPayAmount(data.outstanding > 0 ? data.outstanding.toFixed(2) : "");
      setCarrier(data.shippingCarrier ?? "");
      setTracking(data.shippingTrackingNumber ?? "");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  async function advance(to: OrderStatus) {
    if (!order) return;
    setBusy(true);
    setErr("");
    try {
      const body: Record<string, string> = { status: to };
      if (to === "shipped") {
        if (carrier.trim()) body.shippingCarrier = carrier.trim();
        if (tracking.trim()) body.shippingTrackingNumber = tracking.trim();
      }
      const r = await fetch(`/api/admin/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json();
        setErr(data.error ?? "Status update failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment() {
    if (!order) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Enter a positive amount");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/admin/orders/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, method: payMethod, reference: payRef || undefined, note: payNote || undefined }),
      });
      if (!r.ok) {
        const data = await r.json();
        setErr(data.error ?? "Payment record failed");
        return;
      }
      setPayAmount("");
      setPayRef("");
      setPayNote("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading order…</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="p-6">
        <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">&larr; Orders</Link>
        <p className="text-sm text-gray-500 mt-4">Order not found.</p>
      </div>
    );
  }

  const nxt = nextStatus(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="p-4 md:p-8">
      {/* Print-only styles: hide screen-only chrome, show pick list only */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-area { box-shadow: none !important; border: none !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-900">&larr; Orders</Link>
          <div className="flex gap-2">
            <a
              href={`/api/admin/orders/${order.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Download PDF
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Print pick list
            </button>
          </div>
        </div>

        {/* Header — screen */}
        <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Order #{order.shortCode}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Signed {fmtDateTime(order.signedAt) ?? "—"} · {STATUS_LABEL[order.status]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className={`text-2xl font-semibold ${order.outstanding > 0 ? "text-amber-700" : "text-green-700"}`}>
              {fmtGBP(order.outstanding)}
            </p>
          </div>
        </div>

        {err && <p className="no-print mb-4 text-sm text-red-600">{err}</p>}

        {/* PICK LIST — visible on screen AND print */}
        <section className="print-area bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="font-serif text-xl text-gray-900">Pick list — Order #{order.shortCode}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Signed {fmtDateTime(order.signedAt)}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-gray-900">
                {order.customer?.name || order.customer?.email || "—"}
              </p>
              {order.customer?.companyName && (
                <p className="text-gray-700">{order.customer.companyName}</p>
              )}
              {order.deliverySnapshot && (
                <div className="text-gray-600 mt-2">
                  {order.deliverySnapshot.addressLine1 && <p>{order.deliverySnapshot.addressLine1}</p>}
                  {order.deliverySnapshot.addressLine2 && <p>{order.deliverySnapshot.addressLine2}</p>}
                  {(order.deliverySnapshot.city || order.deliverySnapshot.postcode) && (
                    <p>{[order.deliverySnapshot.city, order.deliverySnapshot.postcode].filter(Boolean).join(" ")}</p>
                  )}
                  {order.deliverySnapshot.country && <p>{order.deliverySnapshot.country}</p>}
                </div>
              )}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-600 border-b border-gray-200">
              <tr>
                <th className="text-left py-2 font-semibold">SKU</th>
                <th className="text-left py-2 font-semibold">Item</th>
                <th className="text-left py-2 font-semibold">Colour</th>
                <th className="text-left py-2 font-semibold">Pack contents</th>
                <th className="text-right py-2 font-semibold">Packs</th>
                <th className="text-right py-2 font-semibold">Pieces</th>
                <th className="text-right py-2 font-semibold">Line £</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((i, idx) => (
                <tr key={`${i.productId}:${i.size ?? ""}:${idx}`}>
                  <td className="py-2 font-mono text-xs">{i.sku}</td>
                  <td className="py-2">
                    <p className="text-gray-900">{i.productName}</p>
                    {i.category && <p className="text-xs text-gray-500">{i.category}</p>}
                  </td>
                  <td className="py-2 text-gray-700">{i.colour ?? "—"}</td>
                  <td className="py-2 text-xs text-gray-600">
                    {i.sizes && i.sizes.length > 0 ? (
                      i.sizes.map((s, si) => (
                        <span key={s} className="inline-block mr-2">
                          {(i.sizeRatio?.[si] ?? 1)}×{s}
                        </span>
                      ))
                    ) : i.size ? (
                      <span>Size {i.size}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-right">{i.packs ?? "—"}</td>
                  <td className="py-2 text-right">{i.quantity}</td>
                  <td className="py-2 text-right">{fmtGBP(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr>
                <td colSpan={4} className="py-3 text-right text-xs uppercase text-gray-600 font-semibold">Totals</td>
                <td className="py-3 text-right font-semibold">{order.items.reduce((s, i) => s + (i.packs ?? 0), 0)}</td>
                <td className="py-3 text-right font-semibold">{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="py-3 text-right font-semibold">{fmtGBP(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Customer + payment summary — screen only */}
        <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Customer</p>
            {order.customer ? (
              <>
                <Link
                  href={`/admin/users/${order.customer.id}`}
                  className="text-gray-900 font-medium hover:underline"
                >
                  {order.customer.name || order.customer.email}
                </Link>
                {order.customer.companyName && <p className="text-sm text-gray-600">{order.customer.companyName}</p>}
                <p className="text-sm text-gray-500 mt-1">{order.customer.email}</p>
                {order.customer.vatNumber && <p className="text-xs text-gray-500 mt-1">VAT {order.customer.vatNumber}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Payment</p>
            <p className="text-sm text-gray-700">Option: {order.paymentOption.replace("_", " ")}</p>
            <p className="text-sm text-gray-700">Status: {order.paymentStatus}</p>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium">{fmtGBP(order.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="font-medium text-green-700">{fmtGBP(order.paid)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                <span className="text-gray-600">Outstanding</span>
                <span className={`font-semibold ${order.outstanding > 0 ? "text-amber-700" : "text-gray-400"}`}>{fmtGBP(order.outstanding)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Fulfilment</p>
            <p className="text-sm text-gray-900 font-medium">{STATUS_LABEL[order.status]}</p>
            <div className="text-xs text-gray-500 mt-2 space-y-0.5">
              {order.pickedAt && <p>Picked {fmtDateTime(order.pickedAt)}</p>}
              {order.readyAt && <p>Ready {fmtDateTime(order.readyAt)}</p>}
              {order.shippedAt && <p>Shipped {fmtDateTime(order.shippedAt)}</p>}
              {order.deliveredAt && <p>Delivered {fmtDateTime(order.deliveredAt)}</p>}
            </div>
            {nxt && !isCancelled && (
              <div className="mt-3 space-y-2">
                {nxt === "shipped" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="Carrier (optional)"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="Tracking number (optional)"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => advance(nxt)}
                  disabled={busy}
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Mark as {STATUS_LABEL[nxt]}
                </button>
              </div>
            )}
            {!isCancelled && order.status !== "delivered" && (
              <button
                type="button"
                onClick={() => advance("cancelled")}
                disabled={busy}
                className="mt-2 w-full px-3 py-2 border border-red-200 text-red-700 rounded text-sm hover:bg-red-50 disabled:opacity-50"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>

        {/* Payments — screen only */}
        <section className="no-print bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Payments recorded</p>
          {order.payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {order.payments.map((p) => (
                <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {fmtGBP(p.amount)}
                      <span className="ml-2 text-xs text-gray-500">via {METHOD_LABEL[p.method] ?? p.method}</span>
                      {p.refunded && <span className="ml-2 text-xs text-red-600">Refunded</span>}
                    </p>
                    {(p.reference || p.note) && (
                      <p className="text-xs text-gray-500">
                        {p.reference}{p.reference && p.note ? " · " : ""}{p.note}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{fmtDateTime(p.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}

          {order.outstanding > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Record a payment</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Amount"
                  className="px-2 py-1.5 border border-gray-200 rounded text-sm"
                />
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  className="px-2 py-1.5 border border-gray-200 rounded text-sm"
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="stripe">Stripe (manual)</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Reference (optional)"
                  className="px-2 py-1.5 border border-gray-200 rounded text-sm"
                />
                <button
                  type="button"
                  onClick={recordPayment}
                  disabled={busy}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Record
                </button>
              </div>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Note (optional)"
                className="mt-2 w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
