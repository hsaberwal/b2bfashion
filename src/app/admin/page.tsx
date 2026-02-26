"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  async function runSeed() {
    setSeeding(true);
    setSeedResult("");
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSeedResult(data.error ?? "Seed failed");
        return;
      }
      setSeedResult(data.message ?? "Done.");
    } finally {
      setSeeding(false);
    }
  }

  if (user === null) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (user?.role !== "admin") {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Admin only
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need an admin account to access this page. Contact your administrator to have your user set as admin.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Just Elegance B2B — Admin
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-8">
          Upload products via API or seed sample data below.
        </p>
        <Link href="/" className="text-sm text-gray-500 hover:underline mb-2 inline-block">
          ← Back to home
        </Link>
        <Link href="/admin/products" className="text-sm text-blue-600 hover:underline mb-6 inline-block ml-4">
          Manage products →
        </Link>

        <section className="border border-gray-200 rounded-lg p-6 bg-white dark:bg-gray-900 dark:border-gray-800 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Seed sample products
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Adds sample products (placeholder images) so you can see the product list and filters. Safe to run multiple times — skips existing SKUs.
          </p>
          <button
            onClick={runSeed}
            disabled={seeding}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Seed sample products"}
          </button>
          {seedResult && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {seedResult}
            </p>
          )}
        </section>

        <section className="border border-gray-200 rounded-lg p-6 bg-white dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Add products via API
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            POST <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/api/admin/products</code> with a JSON body (you must be logged in as admin). Required fields: sku, name, category, stockCategory, colour, packSize. Optional: barcode, styleNumber, description, images (array of URLs), pricePerItem.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            To use images from your existing site (e.g. Just Elegance), use the image URLs in the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">images</code> array when creating a product.
          </p>
        </section>
      </div>
    </main>
  );
}
