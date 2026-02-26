"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-gray-200 rounded-xl p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Check your email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            If an account exists for {email}, you will receive a password reset link. In local dev, check the server console for the link.
          </p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-gray-200 rounded-xl p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Forgot password
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Enter your email and we’ll send a reset link.
        </p>
        <Link href="/login" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to login
        </Link>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </div>
    </main>
  );
}
