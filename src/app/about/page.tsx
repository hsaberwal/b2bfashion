"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type AboutContent = {
  heroTitle: string;
  heroSubtitle: string;
  storyTitle: string;
  storyText1: string;
  storyText2: string;
  whyTitle: string;
  point1Title: string;
  point1Text: string;
  point2Title: string;
  point2Text: string;
  point3Title: string;
  point3Text: string;
  point4Title: string;
  point4Text: string;
  ctaTitle: string;
  ctaText: string;
};

const DEFAULT_CONTENT: AboutContent = {
  heroTitle: "Claudia.C B2B",
  heroSubtitle: "Your trusted wholesale partner for ladies fashion. We supply retailers and boutiques with curated collections designed for the modern woman.",
  storyTitle: "Fashion for Every Woman",
  storyText1: "Claudia.C B2B is a wholesale ladies fashion platform built for retailers who want quality, style, and value. We curate collections that cater to women aged 35\u201355, offering a range of tops, blouses, knitwear, dresses, skirts, jackets, and trousers.",
  storyText2: "Our mission is simple: make it easy for boutiques and retailers to access beautiful, well-made fashion at competitive wholesale prices. Every piece in our collection is chosen with care, ensuring your customers will love what they find.",
  whyTitle: "Why Retailers Choose Us",
  point1Title: "Curated Collections",
  point1Text: "Every piece is hand-selected for quality, fit, and style that your customers will love.",
  point2Title: "Competitive Wholesale Pricing",
  point2Text: "Trade prices that give you healthy margins. Pricing visible once your account is approved.",
  point3Title: "Flexible Payment",
  point3Text: "Pay in full, secure with a 10% deposit, or order on invoice \u2014 whatever suits your business.",
  point4Title: "Pack Ordering",
  point4Text: "Order in packs with a pre-defined mix of sizes. Simple, efficient bulk ordering.",
  ctaTitle: "Get in Touch",
  ctaText: "Ready to stock Claudia.C in your store? Apply for a wholesale account or contact our team for more information.",
};

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState<AboutContent>(DEFAULT_CONTENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load content from DB
    fetch("/api/site-content?key=about")
      .then((r) => r.json())
      .then((d) => {
        if (d.content) {
          setContent({ ...DEFAULT_CONTENT, ...d.content });
          setEditContent({ ...DEFAULT_CONTENT, ...d.content });
        }
      })
      .catch(() => {});

    // Check if admin
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
        body: JSON.stringify({ key: "about", content: editContent }),
      });
      if (res.ok) {
        setContent(editContent);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // Editable text field
  function Field({ field, rows = 1, className = "" }: { field: keyof AboutContent; rows?: number; className?: string }) {
    if (!editing) return null;
    if (rows > 1) {
      return (
        <textarea
          value={editContent[field]}
          onChange={(e) => setEditContent({ ...editContent, [field]: e.target.value })}
          rows={rows}
          className={`w-full px-3 py-2 border border-blue-300 rounded bg-blue-50 text-je-black text-sm mt-1 ${className}`}
        />
      );
    }
    return (
      <input
        type="text"
        value={editContent[field]}
        onChange={(e) => setEditContent({ ...editContent, [field]: e.target.value })}
        className={`w-full px-3 py-2 border border-blue-300 rounded bg-blue-50 text-je-black text-sm mt-1 ${className}`}
      />
    );
  }

  const c = editing ? editContent : content;

  return (
    <main className="min-h-screen bg-white">
      {/* Admin toolbar */}
      {isAdmin && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-blue-700 font-medium">Admin: About Page</span>
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
                  onClick={() => { setEditing(false); setEditContent(content); }}
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

      {/* Hero */}
      <section className="bg-je-black text-white py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label text-white/60 mb-4">About Us</p>
          <h1 className="heading-serif text-white mb-6">{c.heroTitle}</h1>
          <Field field="heroTitle" />
          <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {c.heroSubtitle}
          </p>
          <Field field="heroSubtitle" rows={3} />
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="section-label mb-4">Our Story</p>
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-6">
            {c.storyTitle}
          </h2>
          <Field field="storyTitle" />
          <div className="text-je-muted text-base md:text-lg leading-relaxed space-y-4">
            <p>{c.storyText1}</p>
            <Field field="storyText1" rows={4} />
            <p>{c.storyText2}</p>
            <Field field="storyText2" rows={4} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-4 bg-je-offwhite">
        <div className="max-w-3xl mx-auto">
          <p className="section-label mb-4">How It Works</p>
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-10">
            Ordering Made Simple
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 rounded-full bg-je-black text-white flex items-center justify-center text-sm font-bold mb-4">1</div>
              <h3 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-2">Browse</h3>
              <p className="text-sm text-je-muted leading-relaxed">
                Explore our full catalogue of garments. Filter by category, colour, or season. Add items to your cart — no account needed to start.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-je-black text-white flex items-center justify-center text-sm font-bold mb-4">2</div>
              <h3 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-2">Register</h3>
              <p className="text-sm text-je-muted leading-relaxed">
                Create a wholesale account and apply for access. Once approved, you&apos;ll see trade pricing on all garments.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-je-black text-white flex items-center justify-center text-sm font-bold mb-4">3</div>
              <h3 className="text-sm font-semibold text-je-black uppercase tracking-wider mb-2">Order</h3>
              <p className="text-sm text-je-muted leading-relaxed">
                Checkout with delivery details and choose how to pay — full payment, 10% deposit, or invoice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="section-label mb-4">Why Claudia.C</p>
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-10">{c.whyTitle}</h2>
          <Field field="whyTitle" />
          <div className="space-y-6">
            {([
              { titleField: "point1Title" as const, textField: "point1Text" as const },
              { titleField: "point2Title" as const, textField: "point2Text" as const },
              { titleField: "point3Title" as const, textField: "point3Text" as const },
              { titleField: "point4Title" as const, textField: "point4Text" as const },
            ]).map(({ titleField, textField }) => (
              <div key={titleField}>
                <div className="flex gap-4">
                  <div className="w-1 bg-je-black shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-je-black mb-1">{c[titleField]}</h3>
                    <p className="text-sm text-je-muted">{c[textField]}</p>
                  </div>
                </div>
                {editing && (
                  <div className="ml-5 mt-1 space-y-1">
                    <Field field={titleField} />
                    <Field field={textField} rows={2} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 px-4 bg-je-cream">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-je-black mb-6">{c.ctaTitle}</h2>
          <Field field="ctaTitle" />
          <p className="text-je-muted text-base md:text-lg mb-10 leading-relaxed">{c.ctaText}</p>
          <Field field="ctaText" rows={3} />
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/apply" className="btn-primary">Apply for Access</Link>
            <Link href="/products" className="btn-outline">Browse Garments</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
