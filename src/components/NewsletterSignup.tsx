"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "footer" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not sign up. Please try again.");
        return;
      }
      setStatus("success");
      setMessage("You're on the list. Thank you.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Could not sign up. Please try again.");
    }
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest font-semibold text-white/80 mb-3">
        Newsletter
      </p>
      <p className="text-sm text-white/60 leading-relaxed mb-3">
        New collection drops, restock alerts, and trade-only previews.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/20 text-white placeholder:text-white/40 text-sm focus:border-white/60 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 bg-white text-je-black text-[11px] uppercase tracking-widest font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Join"}
        </button>
      </form>
      {message && (
        <p
          className={`mt-2 text-xs ${
            status === "success" ? "text-green-300" : "text-red-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
