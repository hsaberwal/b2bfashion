"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { STATUS_SHORT_LABEL, type OrderStatus } from "@/lib/orderStatus";

type CustomerOrder = {
  id: string;
  shortCode: string;
  createdAt: string;
  signedAt?: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentOption: string;
  total: number;
  paid: number;
  outstanding: number;
};

type Customer = {
  id: string;
  email: string;
  name?: string;
  companyName?: string;
  vatNumber?: string;
  role: string;
  pricingApproved: boolean;
  emailVerified: boolean;
  deliveryAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  } | null;
  stripeCustomerId?: string;
  applicationMessage?: string;
  agentId?: string | null;
  createdAt: string;
  orders: CustomerOrder[];
  orderCount: number;
  lifetimeSpend: number;
  totalOutstanding: number;
};

type AgentOption = { id: string; email: string; name?: string };

function fmtGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [savingAgent, setSavingAgent] = useState(false);

  async function loadCustomer() {
    const r = await fetch(`/api/admin/users/${id}`);
    setCustomer(r.ok ? await r.json() : null);
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/admin/users/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/agents`).then((r) => (r.ok ? r.json() : { agents: [] })),
    ])
      .then(([c, a]) => {
        setCustomer(c);
        setAgents((a.agents ?? []) as AgentOption[]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function assignAgent(agentId: string) {
    setSavingAgent(true);
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agentId || null }),
      });
      if (r.ok) await loadCustomer();
    } finally {
      setSavingAgent(false);
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-sm text-gray-500">Loading customer…</p></div>;
  }
  if (!customer) {
    return (
      <div className="p-6">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-900">&larr; Customers</Link>
        <p className="text-sm text-gray-500 mt-4">Customer not found.</p>
      </div>
    );
  }

  const addr = customer.deliveryAddress;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-900">&larr; Customers</Link>

        <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-gray-900">
              {customer.name || customer.email}
            </h1>
            {customer.companyName && <p className="text-gray-600 mt-1">{customer.companyName}</p>}
            <p className="text-sm text-gray-500 mt-1">{customer.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Outstanding balance</p>
            <p className={`text-2xl font-semibold ${customer.totalOutstanding > 0 ? "text-amber-700" : "text-green-700"}`}>
              {fmtGBP(customer.totalOutstanding)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Lifetime: {fmtGBP(customer.lifetimeSpend)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Account</p>
            <p className="text-sm text-gray-700">Role: {customer.role}</p>
            <p className="text-sm text-gray-700">Pricing: {customer.pricingApproved ? "Approved" : "Not approved"}</p>
            <p className="text-sm text-gray-700">Email verified: {customer.emailVerified ? "Yes" : "No"}</p>
            {customer.vatNumber && <p className="text-sm text-gray-700">VAT: {customer.vatNumber}</p>}
            {customer.role === "customer" && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <label className="block text-xs text-gray-500 mb-1">Assigned agent</label>
                <select
                  value={customer.agentId ?? ""}
                  onChange={(e) => assignAgent(e.target.value)}
                  disabled={savingAgent}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-50"
                >
                  <option value="">— Unassigned —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name || a.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Delivery address</p>
            {addr ? (
              <div className="text-sm text-gray-700 space-y-0.5">
                {addr.addressLine1 && <p>{addr.addressLine1}</p>}
                {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                {(addr.city || addr.postcode) && <p>{[addr.city, addr.postcode].filter(Boolean).join(" ")}</p>}
                {addr.country && <p>{addr.country}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not set</p>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Stats</p>
            <p className="text-sm text-gray-700">Orders: <span className="font-semibold">{customer.orderCount}</span></p>
            <p className="text-sm text-gray-700">Joined: {fmtDate(customer.createdAt)}</p>
            {customer.stripeCustomerId && (
              <p className="text-xs text-gray-500 mt-1 break-all">Stripe: {customer.stripeCustomerId}</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Order history</h2>
          </div>
          {customer.orders.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Order</th>
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Payment</th>
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                    <th className="text-right px-4 py-3 font-semibold">Paid</th>
                    <th className="text-right px-4 py-3 font-semibold">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-gray-900 hover:underline">
                          #{o.shortCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{fmtDate(o.signedAt ?? o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {STATUS_SHORT_LABEL[o.status as OrderStatus] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{o.paymentOption.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{fmtGBP(o.total)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtGBP(o.paid)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${o.outstanding > 0 ? "text-amber-700" : "text-gray-400"}`}>
                        {o.outstanding > 0 ? fmtGBP(o.outstanding) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {customer.applicationMessage && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Application message</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.applicationMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
