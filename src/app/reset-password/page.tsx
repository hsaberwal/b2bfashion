"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError("Missing reset token. Use the link from your email.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
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
            Password updated
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You can now log in with your new password.
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-gray-200 rounded-xl p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Set new password
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Enter your new password (min 8 characters).
        </p>
        <Link href="/login" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to login
        </Link>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-4"><p className="text-gray-500">Loading…</p></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
