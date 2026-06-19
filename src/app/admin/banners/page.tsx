"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";
import type { HeroBanner, HeroConfig, HeroMode } from "@/lib/heroBanners";

const MODE_OPTIONS: { value: HeroMode; label: string; hint: string }[] = [
  { value: "products", label: "Product photos only", hint: "Auto-cycle stock product images (default)." },
  { value: "banners", label: "Banners only", hint: "Show only the uploaded banners below." },
  { value: "mixed", label: "Banners + product photos", hint: "Banners first, then product photos." },
];

export default function AdminBannersPage() {
  const [mode, setMode] = useState<HeroMode>("products");
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/site-content?key=heroBanners");
      if (r.ok) {
        const data = (await r.json()) as { content: HeroConfig | null };
        if (data.content) {
          setMode(data.content.mode ?? "products");
          setBanners(Array.isArray(data.content.banners) ? data.content.banners : []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setErr("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setErr(data.error ?? "Upload failed");
          break;
        }
        setBanners((prev) => [...prev, { image: data.url, link: "/products", headline: "", subtext: "" }]);
      }
    } catch {
      setErr("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function update(i: number, patch: Partial<HeroBanner>) {
    setBanners((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function remove(i: number) {
    setBanners((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setBanners((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setErr("");
    setSavedAt(null);
    try {
      // Drop empty optional fields so we don't store blank strings.
      const cleanBanners = banners.map((b) => ({
        image: b.image,
        link: b.link?.trim() || undefined,
        headline: b.headline?.trim() || undefined,
        subtext: b.subtext?.trim() || undefined,
      }));
      const r = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "heroBanners", content: { mode, banners: cleanBanners } }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setErr(data.error ?? "Failed to save");
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("en-GB"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Homepage banners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload custom hero banners (JPG/PNG/WebP) and choose how they show on the homepage.
          </p>
        </div>

        {/* Mode */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">What the hero shows</h2>
          <div className="space-y-2">
            {MODE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="heroMode"
                  checked={mode === opt.value}
                  onChange={() => setMode(opt.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  <span className="block text-xs text-gray-500">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Banners */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Banners ({banners.length})</h2>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={onUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload banner"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : banners.length === 0 ? (
            <p className="text-sm text-gray-500">
              No banners yet. Upload a wide image (ideally ~1920×800) to use as a hero banner.
            </p>
          ) : (
            <ul className="space-y-4">
              {banners.map((b, i) => (
                <li key={i} className="flex flex-col sm:flex-row gap-4 border border-gray-100 rounded-lg p-3">
                  <img
                    src={imageDisplayUrl(b.image, { forAdmin: true, width: 320 })}
                    alt=""
                    className="w-full sm:w-40 h-24 object-cover rounded bg-gray-100 shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={b.headline ?? ""}
                      onChange={(e) => update(i, { headline: e.target.value })}
                      placeholder="Headline (optional)"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={b.subtext ?? ""}
                      onChange={(e) => update(i, { subtext: e.target.value })}
                      placeholder="Subtext (optional)"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={b.link ?? ""}
                      onChange={(e) => update(i, { link: e.target.value })}
                      placeholder="Click link, e.g. /products (optional)"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm font-mono"
                    />
                  </div>
                  <div className="flex sm:flex-col gap-1 justify-end">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                      className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30" aria-label="Move up">↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === banners.length - 1}
                      className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30" aria-label="Move down">↓</button>
                    <button type="button" onClick={() => remove(i)}
                      className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save banners"}
          </button>
          {savedAt && <span className="text-xs text-green-700">Saved at {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
