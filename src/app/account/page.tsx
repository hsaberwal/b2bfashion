"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type DeliveryAddress = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

type Profile = {
  email?: string;
  name?: string;
  companyName?: string;
  deliveryAddress?: DeliveryAddress;
  vatNumber?: string;
};

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Profile>({});

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setProfile(null);
          return;
        }
        setProfile(d);
        setForm({
          name: d.name ?? "",
          companyName: d.companyName ?? "",
          vatNumber: d.vatNumber ?? "",
          deliveryAddress: d.deliveryAddress
            ? {
                addressLine1: d.deliveryAddress.addressLine1 ?? "",
                addressLine2: d.deliveryAddress.addressLine2 ?? "",
                city: d.deliveryAddress.city ?? "",
                postcode: d.deliveryAddress.postcode ?? "",
                country: d.deliveryAddress.country ?? "",
              }
            : {
                addressLine1: "",
                addressLine2: "",
                city: "",
                postcode: "",
                country: "United Kingdom",
              },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          companyName: form.companyName || undefined,
          vatNumber: form.vatNumber || undefined,
          deliveryAddress:
            form.deliveryAddress?.addressLine1 && form.deliveryAddress?.city && form.deliveryAddress?.postcode && form.deliveryAddress?.country
              ? {
                  addressLine1: form.deliveryAddress.addressLine1,
                  addressLine2: form.deliveryAddress.addressLine2 || undefined,
                  city: form.deliveryAddress.city,
                  postcode: form.deliveryAddress.postcode,
                  country: form.deliveryAddress.country,
                }
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save");
        return;
      }
      setProfile({ ...profile, ...data });
      setMessage("Saved. Delivery address, VAT number and company details are required before signing an order.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-je-cream">
        <p className="text-je-muted">Loading…</p>
      </main>
    );
  }

  if (!profile || profile.email === undefined) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-je-cream">
        <p className="text-je-muted">Please log in to manage your account.</p>
        <Link href="/login" className="mt-4 inline-block text-je-black font-medium underline hover:no-underline">
          Log in
        </Link>
      </main>
    );
  }

  const addr = form.deliveryAddress ?? {
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-je-cream">
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-je-black tracking-tight">
          Your account
        </h1>
        <Link
          href="/cart"
          className="px-4 py-2 border border-je-border bg-je-white text-je-black hover:bg-je-offwhite transition-colors"
        >
          Cart & orders
        </Link>
      </header>
      <div className="max-w-2xl mx-auto">
        <p className="text-je-muted text-sm mb-6">
          Delivery address, VAT number and company details are required before you can sign an order. Keep them up to date.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6 border border-je-border p-6 bg-je-white">
          <div>
            <label className="block text-sm font-medium text-je-black mb-1">Email</label>
            <p className="text-je-muted text-sm">{profile.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-je-black mb-1">Name *</label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-je-black mb-1">Company name *</label>
            <input
              type="text"
              value={form.companyName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-je-black mb-1">VAT number</label>
            <input
              type="text"
              value={form.vatNumber ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))}
              placeholder="e.g. GB123456789"
              className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
            />
          </div>
          <fieldset className="border border-je-border p-4">
            <legend className="text-sm font-medium text-je-black px-1">Delivery address *</legend>
            <div className="space-y-3 mt-2">
              <div>
                <label className="block text-xs text-je-muted mb-0.5">Address line 1</label>
                <input
                  type="text"
                  value={addr.addressLine1 ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      deliveryAddress: { ...(f.deliveryAddress ?? {}), addressLine1: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-je-muted mb-0.5">Address line 2</label>
                <input
                  type="text"
                  value={addr.addressLine2 ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      deliveryAddress: { ...(f.deliveryAddress ?? {}), addressLine2: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-je-muted mb-0.5">City</label>
                  <input
                    type="text"
                    value={addr.city ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        deliveryAddress: { ...(f.deliveryAddress ?? {}), city: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-je-muted mb-0.5">Postcode</label>
                  <input
                    type="text"
                    value={addr.postcode ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        deliveryAddress: { ...(f.deliveryAddress ?? {}), postcode: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-je-muted mb-0.5">Country</label>
                <input
                  type="text"
                  value={addr.country ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      deliveryAddress: { ...(f.deliveryAddress ?? {}), country: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black"
                  required
                />
              </div>
            </div>
          </fieldset>
          {message && <p className="text-sm text-je-charcoal">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-je-black text-je-white font-medium hover:bg-je-charcoal disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </main>
  );
}
