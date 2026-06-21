"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Agent = {
  id: string;
  email: string;
  name?: string;
  active: boolean;
  emailVerified: boolean;
  customerCount: number;
  createdAt?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/agents");
      if (r.ok) setAgents(((await r.json()).agents ?? []) as Agent[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createAgent() {
    setErr("");
    setNotice("");
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) {
      setErr("Enter a valid email address.");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, name: name.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.error ?? "Failed to create agent");
        return;
      }
      setEmail("");
      setName("");
      setNotice(`Invite sent to ${e}.`);
      await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Agents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sales reps who manage their own customers and place orders on their behalf.
          </p>
        </div>

        {/* Create agent */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Add an agent</h2>
          <p className="text-xs text-gray-500 mb-4">
            We&apos;ll email them a link to set their password and access the agent portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@email.com"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={createAgent}
              disabled={creating}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {creating ? "Sending…" : "Send invite"}
            </button>
          </div>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          {notice && <p className="mt-2 text-sm text-green-700">{notice}</p>}
        </section>

        {/* List */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : agents.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
            No agents yet. Add one above.
          </div>
        ) : (
          <ul className="space-y-2">
            {agents.map((a) => (
              <li key={a.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/admin/agents/${a.id}`} className="text-sm font-medium text-gray-900 hover:underline">
                    {a.name || a.email}
                  </Link>
                  <p className="text-xs text-gray-500 truncate">{a.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-600">{a.customerCount} customer{a.customerCount === 1 ? "" : "s"}</span>
                  {!a.active && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-gray-200 text-gray-700">Inactive</span>
                  )}
                  <Link href={`/admin/agents/${a.id}`} className="text-xs text-blue-600 hover:underline">Manage</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
