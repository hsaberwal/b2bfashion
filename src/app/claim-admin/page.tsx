"use client";

import { useState } from "react";
import Link from "next/link";

export default function ClaimAdminPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-gray-200 rounded-xl p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You’re now an admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You can open Admin to seed products and manage the catalogue.
          </p>
          <Link
            href="/admin"
            className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Go to Admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-gray-200 rounded-xl p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Claim admin
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Log in first, then enter the admin claim secret (set as CLAIM_ADMIN_SECRET in Railway). You’ll be promoted to admin.
        </p>
        <Link href="/" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="CLAIM_ADMIN_SECRET value"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Claiming…" : "Claim admin"}
          </button>
        </form>
      </div>
    </main>
  );
}
