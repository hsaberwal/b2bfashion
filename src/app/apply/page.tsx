"use client";

import { useState } from "react";
import Link from "next/link";

export default function ApplyPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          companyName: companyName || undefined,
          applicationMessage: applicationMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Application failed");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-je-cream">
        <div className="w-full max-w-md border border-je-border rounded-xl p-6 bg-je-white text-center">
          <h1 className="text-2xl font-bold text-je-black mb-2">
            Application received
          </h1>
          <p className="text-je-muted mb-6">
            Thank you. We&apos;ll review your application and get back to you. Once approved, you&apos;ll be able to log in and access the full site, including pricing and ordering.
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-je-black text-je-white rounded-sm hover:bg-je-charcoal font-medium"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-je-cream">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-je-muted hover:underline mb-4 inline-block">
          ← Back to home
        </Link>
        <div className="border border-je-border rounded-xl p-6 bg-je-white">
          <h1 className="text-2xl font-bold text-je-black tracking-tight mb-2">
            Customer application
          </h1>
          <p className="text-je-muted text-sm mb-6">
            To access the full website (browse stock, view pricing, place orders), please submit this form. We&apos;ll review and approve your account.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-je-black mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-je-black mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              />
              <p className="text-xs text-je-muted mt-0.5">At least 8 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-je-black mb-1">Contact name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-je-black mb-1">Company name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-je-black mb-1">Tell us about your business (optional)</label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
                placeholder="e.g. type of retail, locations, expected order volume"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-je-black text-je-white font-medium rounded-sm hover:bg-je-charcoal disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit application"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
