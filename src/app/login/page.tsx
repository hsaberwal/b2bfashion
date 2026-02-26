"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      window.location.href = "/products";
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send OTP");
        return;
      }
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid OTP");
        return;
      }
      window.location.href = "/products";
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-gray-200 rounded-xl p-6 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Log in
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          B2B Ladies Fashion — use password or email OTP
        </p>
        <Link href="/" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to home
        </Link>

        {!otpMode ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Logging in…" : "Log in with password"}
            </button>
            <button
              type="button"
              onClick={() => setOtpMode(true)}
              className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Use email OTP instead
            </button>
          </form>
        ) : (
          <form
            onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={otpSent}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70"
              />
            </div>
            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OTP code (check your email / console in dev)
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading
                ? "Sending…"
                : otpSent
                  ? "Verify OTP"
                  : "Send OTP to email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOtpMode(false);
                setOtpSent(false);
                setOtpCode("");
                setError("");
              }}
              className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Use password instead
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-gray-500">
          <Link href="/forgot-password" className="hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-2 text-sm text-gray-500">
          No account?{" "}
          <Link href="/register" className="hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
