"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type FooterContent = {
  brandName: string;
  legalName: string;
  addressLines: string;
  companyNumber: string;
  vatNumber: string;
  email: string;
  phone: string;
  tagline: string;
};

const DEFAULT_CONTENT: FooterContent = {
  brandName: "Claudia.C",
  legalName: "Coleridge UK Ltd",
  addressLines: "32–34 Sampson Road North\nBirmingham\nB11 1BL",
  companyNumber: "2978255",
  vatNumber: "GB648052142",
  email: "cul.admin@coleridgeuk.com",
  phone: "",
  tagline: "Wholesale ladies fashion — curated collections for retailers and boutiques.",
};

export function Footer() {
  const [content, setContent] = useState<FooterContent>(DEFAULT_CONTENT);
  const [editContent, setEditContent] = useState<FooterContent>(DEFAULT_CONTENT);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/site-content?key=footer")
      .then((r) => r.json())
      .then((d) => {
        if (d.content) {
          const merged = { ...DEFAULT_CONTENT, ...d.content };
          setContent(merged);
          setEditContent(merged);
        }
      })
      .catch(() => {});

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.user?.role === "admin"))
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "footer", content: editContent }),
      });
      if (res.ok) {
        setContent(editContent);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const c = content;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-je-black text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <p className="font-serif text-2xl mb-3">{c.brandName}</p>
            <p className="text-white/60 text-sm leading-relaxed max-w-md">
              {c.tagline}
            </p>
          </div>

          {/* Shop */}
          <div>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-white/80 mb-4">
              Shop
            </p>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  All Garments
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/apply" className="hover:text-white transition-colors">
                  Apply for Wholesale
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-white/80 mb-4">
              Legal
            </p>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition-colors">
                  Returns Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact + company details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-10 border-t border-white/10">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-white/80 mb-4">
              Contact Us
            </p>
            <p className="text-sm text-white/70 font-medium">{c.legalName}</p>
            <p className="text-sm text-white/60 whitespace-pre-line mt-1">
              {c.addressLines}
            </p>
            {c.email && (
              <p className="text-sm text-white/60 mt-3">
                <a
                  href={`mailto:${c.email}`}
                  className="hover:text-white transition-colors"
                >
                  {c.email}
                </a>
              </p>
            )}
            {c.phone && <p className="text-sm text-white/60 mt-1">{c.phone}</p>}
          </div>
          <div className="md:text-right">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-white/80 mb-4">
              Company
            </p>
            {c.companyNumber && (
              <p className="text-sm text-white/60">
                Registered in England &amp; Wales &middot; Company No.{" "}
                <span className="text-white/80">{c.companyNumber}</span>
              </p>
            )}
            {c.vatNumber && (
              <p className="text-sm text-white/60 mt-1">
                VAT No. <span className="text-white/80">{c.vatNumber}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            &copy; {year} {c.legalName}. All rights reserved.
          </p>
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] uppercase tracking-widest text-white/40 hover:text-white transition-colors font-medium"
            >
              Edit Footer
            </button>
          )}
        </div>

        {/* Admin editor (inline, expanded) */}
        {isAdmin && editing && (
          <div className="mt-8 p-6 bg-white text-je-black rounded-lg">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-4">
              Edit Footer
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Brand name"
                value={editContent.brandName}
                onChange={(v) => setEditContent({ ...editContent, brandName: v })}
              />
              <Field
                label="Legal company name"
                value={editContent.legalName}
                onChange={(v) => setEditContent({ ...editContent, legalName: v })}
              />
              <div className="md:col-span-2">
                <Field
                  label="Tagline"
                  value={editContent.tagline}
                  onChange={(v) => setEditContent({ ...editContent, tagline: v })}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Field
                  label="Address (one line per row)"
                  value={editContent.addressLines}
                  onChange={(v) => setEditContent({ ...editContent, addressLines: v })}
                  rows={3}
                />
              </div>
              <Field
                label="Company number"
                value={editContent.companyNumber}
                onChange={(v) => setEditContent({ ...editContent, companyNumber: v })}
              />
              <Field
                label="VAT number"
                value={editContent.vatNumber}
                onChange={(v) => setEditContent({ ...editContent, vatNumber: v })}
              />
              <Field
                label="Email"
                value={editContent.email}
                onChange={(v) => setEditContent({ ...editContent, email: v })}
              />
              <Field
                label="Phone (optional)"
                value={editContent.phone}
                onChange={(v) => setEditContent({ ...editContent, phone: v })}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditContent(content);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-je-muted">{label}</span>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 border border-je-border rounded text-je-black text-sm mt-1"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-je-border rounded text-je-black text-sm mt-1"
        />
      )}
    </label>
  );
}
