"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "comingSoonDismissed";
const DEFAULT_MESSAGE = "Coming soon — our new wholesale site is launching shortly.";

/**
 * A dismissible "coming soon" banner shown only to logged-out visitors when an
 * admin has enabled it (stored in SiteContent under the `comingSoon` key).
 * Logged-in users (admins and approved customers) never see it, so the team can
 * keep editing and using the real site while the public sees the notice.
 */
export function ComingSoonBanner() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, sessionRes] = await Promise.all([
          fetch("/api/site-content?key=comingSoon"),
          fetch("/api/auth/session"),
        ]);
        if (cancelled) return;

        const statusData = statusRes.ok ? await statusRes.json() : null;
        const content = statusData?.content as { enabled?: boolean; message?: string } | null;
        if (!content?.enabled) return;

        // Logged-in users (admins + customers) bypass the banner entirely.
        const sessionData = sessionRes.ok ? await sessionRes.json() : null;
        if (sessionData?.user) return;

        if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1") return;

        if (content.message) setMessage(content.message);
        setShow(true);
      } catch {
        // Network/parse error — fail closed (no banner).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="bg-amber-500 text-je-black text-center text-xs md:text-sm py-2.5 px-4 font-medium flex items-center justify-center gap-3">
      <span>{message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded px-1.5 leading-none text-base hover:bg-black/10"
      >
        ×
      </button>
    </div>
  );
}
