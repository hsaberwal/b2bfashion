"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";
const REOPEN_EVENT = "cookie-consent:reopen";

type Choice = "accepted" | "rejected";

export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

export function CookieConsent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(STORAGE_KEY) as Choice | null;
    if (!existing) setVisible(true);

    const onReopen = () => setVisible(true);
    window.addEventListener(REOPEN_EVENT, onReopen);
    return () => window.removeEventListener(REOPEN_EVENT, onReopen);
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  function record(choice: Choice) {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 bg-je-white border border-je-border shadow-xl p-5"
    >
      <p className="text-sm text-je-black font-medium mb-1">Cookies on this site</p>
      <p className="text-xs text-je-muted leading-relaxed mb-4">
        We use essential cookies to keep you signed in, secure your session, and remember your cart.
        Optional analytics cookies help us improve the site. Read our{" "}
        <Link href="/privacy" className="text-je-black underline hover:no-underline">
          privacy policy
        </Link>
        .
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => record("rejected")}
          className="flex-1 px-3 py-2 border border-je-border text-je-black text-[11px] uppercase tracking-widest font-semibold hover:bg-je-offwhite transition-colors"
        >
          Reject optional
        </button>
        <button
          type="button"
          onClick={() => record("accepted")}
          className="flex-1 px-3 py-2 bg-je-black text-je-white text-[11px] uppercase tracking-widest font-semibold hover:bg-je-charcoal transition-colors"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
