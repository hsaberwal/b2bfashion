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
  createdAt?: string;
};

export default function AdminUsersPage() {
  const [user, setUser] = useState<{ id?: string; email?: string; role?: string } | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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

  async function togglePricing(u: UserRow) {
    setUpdating(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingApproved: !u.pricingApproved }),
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

  async function toggleForwardStock(u: UserRow) {
    setUpdating(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canViewForwardStock: Boolean(!u.canViewForwardStock) }),
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
    if (u.id === user?.id || u.email === user?.email) return;
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

  if (user === null || loading) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (user?.role !== "admin") {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin only</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need an admin account to access this page.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Manage users
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
          Allow pricing, forward stock visibility, and promote users to admin.
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
          To make someone an admin: find their row and click <strong>Make admin</strong> in the Role column. You cannot change your own role.
        </p>
        <Link href="/admin" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to Admin
        </Link>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white dark:bg-gray-900 dark:border-gray-800">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Name / Company</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Role / Make admin</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Allow pricing</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">View forward stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {u.name ?? "—"} {u.companyName ? `· ${u.companyName}` : ""}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mr-2">{u.role}</span>
                    {(u.id !== user?.id && u.email !== user?.email) ? (
                      u.role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => setRole(u, "customer")}
                          disabled={updating === u.id}
                          className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:opacity-90 disabled:opacity-50"
                        >
                          {updating === u.id ? "…" : "Remove admin"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRole(u, "admin")}
                          disabled={updating === u.id}
                          className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:opacity-90 disabled:opacity-50"
                        >
                          {updating === u.id ? "…" : "Make admin"}
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => togglePricing(u)}
                      disabled={updating === u.id}
                      className={`px-2 py-1 text-xs rounded ${
                        u.pricingApproved
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      } disabled:opacity-50`}
                    >
                      {updating === u.id ? "…" : u.pricingApproved ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400" title="Admins always see forward stock">
                        Yes (admin)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleForwardStock(u)}
                        disabled={updating === u.id}
                        className={`px-2 py-1 text-xs rounded ${
                          u.canViewForwardStock
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        } disabled:opacity-50`}
                      >
                        {updating === u.id ? "…" : u.canViewForwardStock ? "Yes" : "No"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">No users yet.</p>
          )}
          {users.length > 0 && users.every((u) => u.id === user?.id || u.email === user?.email) && (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              You’re the only user. When others register or log in, they’ll appear here. Click <strong>Make admin</strong> next to a customer to grant them admin access.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
