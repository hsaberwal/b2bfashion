"use client";

import { useCallback, useEffect, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_COMING_SOON_MESSAGE = "Coming soon — our new wholesale site is launching shortly.";

export default function AdminSettingsPage() {
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Coming-soon banner
  const [csEnabled, setCsEnabled] = useState(false);
  const [csMessage, setCsMessage] = useState("");
  const [csSaving, setCsSaving] = useState(false);
  const [csSavedAt, setCsSavedAt] = useState<string | null>(null);

  const loadComingSoon = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/site-content?key=comingSoon");
      if (r.ok) {
        const data = (await r.json()) as { content: { enabled?: boolean; message?: string } | null };
        setCsEnabled(Boolean(data.content?.enabled));
        setCsMessage(data.content?.message ?? "");
      }
    } catch {
      // leave defaults
    }
  }, []);

  useEffect(() => {
    loadComingSoon();
  }, [loadComingSoon]);

  async function saveComingSoon(nextEnabled: boolean) {
    setCsSaving(true);
    setCsSavedAt(null);
    try {
      const r = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "comingSoon",
          content: { enabled: nextEnabled, message: csMessage.trim() || DEFAULT_COMING_SOON_MESSAGE },
        }),
      });
      if (r.ok) {
        setCsEnabled(nextEnabled);
        setCsSavedAt(new Date().toLocaleTimeString("en-GB"));
      }
    } finally {
      setCsSaving(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/notification-recipients");
      if (r.ok) {
        const data = (await r.json()) as { emails: string[] };
        setEmails(data.emails ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function addEmail() {
    const email = input.trim().toLowerCase();
    setErr("");
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setErr("That doesn't look like a valid email address.");
      return;
    }
    if (emails.includes(email)) {
      setErr("That address is already on the list.");
      setInput("");
      return;
    }
    setEmails((prev) => [...prev, email]);
    setInput("");
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  async function save() {
    setSaving(true);
    setErr("");
    setSavedAt(null);
    try {
      const r = await fetch("/api/admin/notification-recipients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setErr(data.error ?? "Failed to save");
        return;
      }
      const data = (await r.json()) as { emails: string[] };
      setEmails(data.emails ?? []);
      setSavedAt(new Date().toLocaleTimeString("en-GB"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage who gets notified when an order is placed.</p>
        </div>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900">New-order notification emails</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            These addresses receive an email whenever a customer signs an order. Changes apply to all
            future orders as soon as you save.
          </p>

          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <>
              {emails.length === 0 ? (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No recipients set. New-order alerts currently fall back to the{" "}
                  <code>ADMIN_NOTIFICATION_EMAILS</code> environment variable, or to every admin user if
                  that&apos;s unset. Add an address below to manage recipients here instead.
                </div>
              ) : (
                <ul className="mb-4 divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {emails.map((email) => (
                    <li key={email} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="text-sm text-gray-800">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  placeholder="name@company.com"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Add
                </button>
              </div>

              {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save recipients"}
                </button>
                {savedAt && <span className="text-xs text-green-700">Saved at {savedAt}</span>}
              </div>
            </>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5 mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">&ldquo;Coming soon&rdquo; banner</h2>
              <p className="text-xs text-gray-500 mt-1">
                When on, logged-out visitors see a dismissible &ldquo;coming soon&rdquo; banner. You and
                logged-in customers still see and can use the full site as normal.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={csEnabled}
              disabled={csSaving}
              onClick={() => saveComingSoon(!csEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                csEnabled ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  csEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Banner message</label>
            <input
              type="text"
              value={csMessage}
              onChange={(e) => setCsMessage(e.target.value)}
              placeholder={DEFAULT_COMING_SOON_MESSAGE}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveComingSoon(csEnabled)}
                disabled={csSaving}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {csSaving ? "Saving…" : "Save message"}
              </button>
              {csSavedAt && <span className="text-xs text-green-700">Saved at {csSavedAt}</span>}
              <span className="text-xs text-gray-500">
                Banner is currently <strong>{csEnabled ? "ON" : "OFF"}</strong>.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
