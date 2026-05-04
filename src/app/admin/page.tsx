"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { imageDisplayUrl } from "@/lib/imageDisplayUrl";

type Stats = {
  products: { total: number; hidden: number; active: number };
  customers: { total: number; pendingPricing: number; unverified: number };
  lowStock: {
    count: number;
    items: { id: string; sku: string; name: string; image?: string; category: string; available: number }[];
  };
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setStats(d);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="font-serif text-2xl md:text-3xl text-gray-900">Home</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your store today.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard
            label="Active products"
            value={loading ? "—" : String(stats?.products.active ?? 0)}
            sub={loading ? "" : `${stats?.products.hidden ?? 0} hidden`}
            href="/admin/products"
          />
          <StatCard
            label="Customers"
            value={loading ? "—" : String(stats?.customers.total ?? 0)}
            sub={loading ? "" : `${stats?.customers.unverified ?? 0} unverified`}
            href="/admin/users"
          />
          <StatCard
            label="Pending approval"
            value={loading ? "—" : String(stats?.customers.pendingPricing ?? 0)}
            sub="Awaiting pricing"
            href="/admin/users"
            tone={stats?.customers.pendingPricing ? "warn" : "default"}
          />
          <StatCard
            label="Low stock"
            value={loading ? "—" : String(stats?.lowStock.count ?? 0)}
            sub="Under 5 packs"
            href="/admin/products"
            tone={stats?.lowStock.count ? "warn" : "default"}
          />
        </div>

        {/* Two-column area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Quick actions */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Quick actions</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                <ActionRow
                  href="/admin/products/new"
                  title="Add a product"
                  desc="Upload photos, scan labels, set pricing"
                />
                <ActionRow
                  href="/admin/products/import"
                  title="Bulk import"
                  desc="Update prices & stock from a spreadsheet"
                />
                <ActionRow
                  href="/admin/users"
                  title="Approve customers"
                  desc="Toggle pricing access for new accounts"
                />
                <ActionRow
                  href="/admin/pages"
                  title="Edit site pages"
                  desc="About, Terms, Privacy, Footer"
                />
              </ul>
            </div>
          </div>

          {/* Low stock */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Running low on stock</h2>
                <Link href="/admin/products" className="text-xs text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
              {loading ? (
                <div className="p-6 text-sm text-gray-500">Loading…</div>
              ) : !stats?.lowStock.items.length ? (
                <div className="p-6 text-sm text-gray-500">All active products have at least 5 packs available.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.lowStock.items.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                      >
                        {p.image ? (
                          <img
                            src={imageDisplayUrl(p.image, { forAdmin: true })}
                            alt=""
                            className="w-10 h-10 object-cover rounded shrink-0 bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 truncate">{p.sku} · {p.category}</p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            p.available === 0 ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {p.available} avail
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  href: string;
  tone?: "default" | "warn";
}) {
  const dotColour =
    tone === "warn" ? "bg-amber-500" : "bg-gray-300";
  return (
    <Link
      href={href}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColour}`} />
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl md:text-3xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </Link>
  );
}

function ActionRow({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="text-gray-400 group-hover:text-gray-600 mt-0.5 shrink-0"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </li>
  );
}
