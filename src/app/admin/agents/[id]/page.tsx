"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type AgentCustomer = {
  id: string;
  email: string;
  name?: string;
  companyName?: string;
  outstanding: number;
};

type AgentDetail = {
  id: string;
  email: string;
  name?: string;
  active: boolean;
  emailVerified: boolean;
  customers: AgentCustomer[];
};

function fmtGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

export default function AdminAgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/agents/${id}`);
      setAgent(r.ok ? ((await r.json()) as AgentDetail) : null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  async function setActive(active: boolean) {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/admin/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!r.ok) setErr((await r.json()).error ?? "Update failed");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  async function unassign(customerId: string) {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/admin/users/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: null }),
      });
      if (!r.ok) setErr((await r.json()).error ?? "Failed to unassign");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteAgent() {
    if (!confirm("Delete this agent? Their customers stay but become unassigned. This cannot be undone.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/agents/${id}`, { method: "DELETE" });
      if (r.ok) router.push("/admin/agents");
      else setErr((await r.json()).error ?? "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  if (!agent) return <div className="p-8 text-sm text-gray-500">Agent not found.</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/admin/agents" className="text-sm text-gray-500 hover:text-gray-900">&larr; Agents</Link>

        <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-gray-900">{agent.name || agent.email}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {agent.email} · {agent.active ? "Active" : "Inactive"}
              {!agent.emailVerified && " · invite pending"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActive(!agent.active)}
              disabled={busy}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {agent.active ? "Deactivate" : "Reactivate"}
            </button>
            <button
              type="button"
              onClick={deleteAgent}
              disabled={busy}
              className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>

        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Assigned customers ({agent.customers.length})</h2>
          <p className="text-xs text-gray-500 mb-4">
            Assign customers to an agent from the customer&apos;s page (Customers → open a customer → Assign agent).
          </p>
          {agent.customers.length === 0 ? (
            <p className="text-sm text-gray-500">No customers assigned yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {agent.customers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${c.id}`} className="text-sm text-gray-900 hover:underline">
                      {c.companyName || c.name || c.email}
                    </Link>
                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-medium ${c.outstanding > 0 ? "text-amber-700" : "text-gray-400"}`}>
                      {fmtGBP(c.outstanding)}
                    </span>
                    <button type="button" onClick={() => unassign(c.id)} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">
                      Unassign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
