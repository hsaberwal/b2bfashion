"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithCsrf } from "@/lib/fetchWithCsrf";

type Customer = { id: string; email: string; name?: string; companyName?: string; outstanding: number };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AgentHomePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/agent/customers");
      if (r.ok) setCustomers(((await r.json()).customers ?? []) as Customer[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(invite: boolean) {
    setErr("");
    setNotice("");
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr("Enter a valid email."); return; }
    setBusy(true);
    try {
      const url = invite ? "/api/agent/customers/invite" : "/api/agent/customers";
      const r = await fetchWithCsrf(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, name: name.trim() || undefined, companyName: company.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error ?? "Failed"); return; }
      setEmail(""); setName(""); setCompany(""); setShowAdd(false);
      setNotice(invite ? `Invite sent to ${e}.` : `Added ${e}.`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">My customers</h1>
          <p className="text-sm text-gray-500">Pick a customer to build an order, or add a new one.</p>
        </div>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800">
          {showAdd ? "Close" : "Add customer"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" className="w-full px-3 py-2 border border-gray-200 rounded text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" className="w-full px-3 py-2 border border-gray-200 rounded text-sm" />
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="w-full px-3 py-2 border border-gray-200 rounded text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => submit(false)} disabled={busy} className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">Add (no login)</button>
            <button type="button" onClick={() => submit(true)} disabled={busy} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Invite by email</button>
          </div>
          <p className="text-xs text-gray-500">&quot;Add&quot; creates a record you can order for. &quot;Invite&quot; also emails them a link to set a password and log in.</p>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      )}
      {notice && <p className="mb-3 text-sm text-green-700">{notice}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">No customers yet. Add one above.</div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link href={`/agent/customers/${c.id}/order`} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.companyName || c.name || c.email}</p>
                  <p className="text-xs text-gray-500 truncate">{c.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${c.outstanding > 0 ? "text-amber-700" : "text-gray-400"}`}>£{c.outstanding.toFixed(2)}</p>
                  <p className="text-[11px] text-gray-400">owed</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
