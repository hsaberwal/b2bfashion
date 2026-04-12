"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const ADMIN_SECTIONS = [
  {
    title: "Manage Garments",
    description: "Add, edit, and delete garments. Upload photos, generate AI model images, and scan care labels.",
    href: "/admin/products",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    title: "Manage Users",
    description: "View registered users, approve pricing, manage permissions, and delete spam accounts.",
    href: "/admin/users",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: "Manage About Page",
    description: "Edit the About Us page content — story, why choose us, and call to action text.",
    href: "/about",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  const [user, setUser] = useState<{ role?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  if (user === null) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-je-muted">Loading...</p>
      </main>
    );
  }

  if (user?.role !== "admin") {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="font-serif text-3xl text-je-black mb-4">Admin Only</h1>
          <p className="text-je-muted mb-6">
            You need an admin account to access this page.
          </p>
          <Link href="/" className="btn-outline">&larr; Back to Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Header with nav links */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-je-black">Admin</h1>
            <p className="text-je-muted text-sm mt-1">Claudia.C B2B management</p>
          </div>
          <div className="flex gap-3">
            {ADMIN_SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium"
              >
                {s.title.replace("Manage ", "")}
              </Link>
            ))}
          </div>
        </div>

        {/* Section cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {ADMIN_SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group p-6 border border-je-border rounded-lg bg-je-offwhite hover:bg-je-cream hover:border-je-charcoal transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-je-black text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <h2 className="text-sm font-semibold text-je-black mb-2">{s.title}</h2>
              <p className="text-xs text-je-muted leading-relaxed">{s.description}</p>
            </Link>
          ))}
        </div>

        {/* Quick stats */}
        <div className="border border-je-border rounded-lg p-6 bg-je-offwhite">
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-je-black mb-4">
            Quick Reference
          </h2>
          <div className="text-sm text-je-muted space-y-2">
            <p>
              <strong className="text-je-charcoal">Add garments:</strong> Go to Garments &rarr; New product. Upload photos, scan labels with AI, generate model photos.
            </p>
            <p>
              <strong className="text-je-charcoal">Homepage curation:</strong> Edit any garment and use the three checkboxes: Front Page, Featured Styles, Our Latest Looks.
            </p>
            <p>
              <strong className="text-je-charcoal">Approve users:</strong> Go to Users, toggle &ldquo;Allow pricing&rdquo; for approved wholesale accounts.
            </p>
            <p>
              <strong className="text-je-charcoal">Edit About page:</strong> Visit the About page while logged in as admin &mdash; click &ldquo;Edit Page&rdquo; at the top.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
