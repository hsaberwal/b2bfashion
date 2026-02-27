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
    <main className="min-h-screen flex items-center justify-center p-4 bg-je-cream">
      <div className="w-full max-w-md border border-je-border p-6 bg-je-white">
        <h1 className="text-2xl font-bold text-je-black mb-2">
          Log in
        </h1>
        <p className="text-je-muted text-sm mb-6">
          Claudia B2B — use password or email OTP
        </p>
        <Link href="/" className="text-sm text-je-muted hover:underline mb-4 inline-block">
          ← Back to home
        </Link>

        {!otpMode ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-je-black mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-je-black mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-je-black text-je-white hover:bg-je-charcoal disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Log in with password"}
            </button>
            <button
              type="button"
              onClick={() => setOtpMode(true)}
              className="w-full py-2 border border-je-border hover:bg-je-offwhite"
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
              <label className="block text-sm font-medium text-je-black mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={otpSent}
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black disabled:opacity-70"
              />
            </div>
            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-je-black mb-1">
                  OTP code (check your email / console in dev)
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-je-black text-je-white hover:bg-je-charcoal disabled:opacity-50"
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
              className="w-full py-2 border border-je-border hover:bg-je-offwhite"
            >
              Use password instead
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-je-muted">
          <Link href="/forgot-password" className="hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-2 text-sm text-je-muted">
          No account?{" "}
          <Link href="/register" className="hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
