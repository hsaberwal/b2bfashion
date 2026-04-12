"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  email: string;
  name?: string;
  companyName?: string;
  role: string;
  pricingApproved: boolean;
  canViewForwardStock: boolean;
  canViewCurrentStock: boolean;
  canViewPreviousStock: boolean;
  applicationMessage?: string;
  emailVerified?: boolean;
  createdAt?: string;
  // Extended fields loaded on expand
  deliveryAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  vatNumber?: string;
};

export default function AdminUsersPage() {
  const [user, setUser] = useState<{ id?: string; email?: string; role?: string } | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkForwarding, setBulkForwarding] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }, [user?.role]);

  async function toggleField(u: UserRow, field: string, value: boolean) {
    setUpdating(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Update failed");
        return;
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } finally {
      setUpdating(null);
    }
  }

  async function setRole(u: UserRow, role: "customer" | "admin") {
    if (u.id === user?.id) return;
    setUpdating(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Update failed");
        return;
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } finally {
      setUpdating(null);
    }
  }

  async function deleteUser(u: UserRow) {
    if (u.id === user?.id) return;
    if (!confirm(`Delete user ${u.email}? This removes their account and pending orders.`)) return;
    setUpdating(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Delete failed");
        return;
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } finally {
      setUpdating(null);
    }
  }

  async function enableForwardStockForAll() {
    if (!confirm("Enable forward stock for all customers?")) return;
    setBulkForwarding(true);
    try {
      const res = await fetch("/api/admin/users/bulk-enable-forward", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Failed"); return; }
      alert(`Updated ${data.modifiedCount ?? 0} customer(s).`);
      const refresh = await fetch("/api/admin/users").then((r) => r.json());
      setUsers(refresh.users ?? []);
    } finally {
      setBulkForwarding(false);
    }
  }

  function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
    return (
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
          checked
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-500"
        } disabled:opacity-50`}
      >
        {disabled ? "..." : checked ? `${label}: Yes` : `${label}: No`}
      </button>
    );
  }

  if (user === null || loading) {
    return <main className="min-h-screen p-8"><p className="text-je-muted">Loading...</p></main>;
  }
  if (user?.role !== "admin") {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="font-serif text-3xl text-je-black mb-4">Admin Only</h1>
          <Link href="/" className="btn-outline">&larr; Back to Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl text-je-black">Manage Users</h1>
            <p className="text-je-muted text-sm mt-1">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium">
              &larr; Admin
            </Link>
            <button
              onClick={enableForwardStockForAll}
              disabled={bulkForwarding}
              className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium disabled:opacity-50"
            >
              {bulkForwarding ? "Updating..." : "Enable forward stock for all"}
            </button>
          </div>
        </div>

        {/* User cards */}
        <div className="space-y-3">
          {users.map((u) => {
            const isExpanded = expandedId === u.id;
            const isSelf = u.id === user?.id || u.email === user?.email;
            return (
              <div key={u.id} className="border border-je-border rounded-lg overflow-hidden bg-je-offwhite">
                {/* Summary row — always visible */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : u.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-je-cream transition-colors"
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                  }`}>
                    {(u.name?.[0] ?? u.email[0]).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-je-black truncate">{u.email}</span>
                      {u.role === "admin" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Admin</span>
                      )}
                      {!u.emailVerified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Unverified</span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-medium">You</span>
                      )}
                    </div>
                    <p className="text-xs text-je-muted truncate">
                      {u.name ?? "No name"}{u.companyName ? ` — ${u.companyName}` : ""}
                      {u.createdAt ? ` — Joined ${new Date(u.createdAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>

                  {/* Chevron */}
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-je-muted transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-je-border bg-white">
                    {/* User info grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">Email</p>
                        <p className="text-sm text-je-black">{u.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">Name</p>
                        <p className="text-sm text-je-black">{u.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">Company</p>
                        <p className="text-sm text-je-black">{u.companyName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">VAT Number</p>
                        <p className="text-sm text-je-black">{u.vatNumber || "—"}</p>
                      </div>
                      {u.deliveryAddress && (
                        <div className="md:col-span-2">
                          <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">Delivery Address</p>
                          <p className="text-sm text-je-black">
                            {[
                              u.deliveryAddress.addressLine1,
                              u.deliveryAddress.addressLine2,
                              u.deliveryAddress.city,
                              u.deliveryAddress.postcode,
                              u.deliveryAddress.country,
                            ].filter(Boolean).join(", ") || "—"}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">Email Verified</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${u.emailVerified ? "text-green-700" : "text-amber-600"}`}>
                            {u.emailVerified ? "Yes" : "No"}
                          </p>
                          {!u.emailVerified && (
                            <button
                              type="button"
                              onClick={() => toggleField(u, "emailVerified", true)}
                              disabled={updating === u.id}
                              className="px-2 py-0.5 text-[10px] rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50 font-medium"
                            >
                              {updating === u.id ? "..." : "Verify Now"}
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">Joined</p>
                        <p className="text-sm text-je-black">
                          {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                      {u.applicationMessage && (
                        <div className="md:col-span-2">
                          <p className="text-[10px] uppercase tracking-widest text-je-muted mb-1">Application Message</p>
                          <p className="text-sm text-je-black whitespace-pre-wrap">{u.applicationMessage}</p>
                        </div>
                      )}
                    </div>

                    {/* Permissions */}
                    <div className="border-t border-je-border pt-3">
                      <p className="text-[10px] uppercase tracking-widest text-je-muted mb-2">Permissions</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {u.role === "admin" ? (
                          <span className="text-xs text-je-muted">Admin has full access</span>
                        ) : (
                          <>
                            <Toggle
                              checked={u.pricingApproved}
                              onChange={() => toggleField(u, "pricingApproved", !u.pricingApproved)}
                              disabled={updating === u.id}
                              label="Pricing"
                            />
                            <Toggle
                              checked={u.canViewForwardStock}
                              onChange={() => toggleField(u, "canViewForwardStock", !u.canViewForwardStock)}
                              disabled={updating === u.id}
                              label="Forward Stock"
                            />
                            <Toggle
                              checked={u.canViewCurrentStock}
                              onChange={() => toggleField(u, "canViewCurrentStock", !u.canViewCurrentStock)}
                              disabled={updating === u.id}
                              label="Current Stock"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isSelf && (
                      <div className="border-t border-je-border pt-3 flex flex-wrap gap-2">
                        {u.role === "admin" ? (
                          <button
                            onClick={() => setRole(u, "customer")}
                            disabled={updating === u.id}
                            className="px-3 py-1.5 text-xs rounded bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                          >
                            Remove Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => setRole(u, "admin")}
                            disabled={updating === u.id}
                            className="px-3 py-1.5 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                          >
                            Make Admin
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={updating === u.id}
                          className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                        >
                          Delete User
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {users.length === 0 && (
            <p className="text-center text-je-muted py-8">No users yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
