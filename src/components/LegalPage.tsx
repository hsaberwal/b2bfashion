"use client";

import { useState, useEffect } from "react";
import { renderRichText } from "@/lib/richText";

export type LegalContent = {
  title: string;
  subtitle?: string;
  body: string;
};

type Props = {
  storageKey: string;
  defaultContent: LegalContent;
  adminLabel: string;
};

export function LegalPage({ storageKey, defaultContent, adminLabel }: Props) {
  const [content, setContent] = useState<LegalContent>(defaultContent);
  const [editContent, setEditContent] = useState<LegalContent>(defaultContent);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/site-content?key=${encodeURIComponent(storageKey)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.content) {
          const merged = { ...defaultContent, ...d.content };
          setContent(merged);
          setEditContent(merged);
        }
      })
      .catch(() => {});

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.user?.role === "admin"))
      .catch(() => {});
    // defaultContent is a stable per-page constant; storageKey is the only real input
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: storageKey, content: editContent }),
      });
      if (res.ok) {
        setContent(editContent);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const c = editing ? editContent : content;

  return (
    <main className="min-h-screen bg-white">
      {isAdmin && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-blue-700 font-medium">
            Admin: {adminLabel}
          </span>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditContent(content);
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Edit Page
              </button>
            )}
          </div>
        </div>
      )}

      <section className="bg-je-black text-white py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-white mb-4">{c.title}</h1>
          {editing && (
            <input
              type="text"
              value={editContent.title}
              onChange={(e) =>
                setEditContent({ ...editContent, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-blue-300 rounded bg-blue-50 text-je-black text-sm mb-4"
            />
          )}
          {c.subtitle && (
            <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              {c.subtitle}
            </p>
          )}
          {editing && (
            <textarea
              value={editContent.subtitle ?? ""}
              onChange={(e) =>
                setEditContent({ ...editContent, subtitle: e.target.value })
              }
              rows={2}
              placeholder="Subtitle (optional)"
              className="w-full px-3 py-2 border border-blue-300 rounded bg-blue-50 text-je-black text-sm mt-2"
            />
          )}
        </div>
      </section>

      <section className="py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {editing ? (
            <>
              <p className="text-xs text-je-muted mb-2">
                Use blank lines between paragraphs. Start a line with{" "}
                <code className="bg-je-offwhite px-1">## </code> for a heading,
                or <code className="bg-je-offwhite px-1">* </code> /{" "}
                <code className="bg-je-offwhite px-1">- </code> for bullet
                points. Numbered lists use{" "}
                <code className="bg-je-offwhite px-1">1. </code>.
              </p>
              <textarea
                value={editContent.body}
                onChange={(e) =>
                  setEditContent({ ...editContent, body: e.target.value })
                }
                rows={30}
                className="w-full px-3 py-2 border border-blue-300 rounded bg-blue-50 text-je-black text-sm font-mono"
              />
            </>
          ) : (
            <article>{renderRichText(c.body)}</article>
          )}
        </div>
      </section>
    </main>
  );
}
