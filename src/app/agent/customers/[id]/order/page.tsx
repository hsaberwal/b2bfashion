"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithCsrf } from "@/lib/fetchWithCsrf";
import { SignaturePad } from "@/components/SignaturePad";
import { DEFAULT_PAYMENT_OPTIONS, PAYMENT_OPTION_LABELS, type PaymentOptionKey, type PaymentOptionsConfig } from "@/lib/paymentOptions";

type BasketLine = { productId: string; sku: string; name: string; colour?: string; image?: string; packSize: number; packs: number; quantity: number; pricePerPiece?: number; lineTotal: number };
type Basket = { orderId: string | null; items: BasketLine[]; total: number };
type ProductHit = { id: string; sku: string; name: string; colour?: string; packSize: number; minPacks: number; pricePerPiece?: number; available: number };

const ORDER: PaymentOptionKey[] = ["pay_now", "pay_deposit", "pay_later"];

export default function AgentOrderPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [basket, setBasket] = useState<Basket>({ orderId: null, items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [payOpts, setPayOpts] = useState<PaymentOptionsConfig>(DEFAULT_PAYMENT_OPTIONS);
  const [payOption, setPayOption] = useState<PaymentOptionKey>("pay_now");
  const [signature, setSignature] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");

  const loadBasket = useCallback(async () => {
    const r = await fetch(`/api/agent/orders?customerId=${customerId}`);
    if (r.ok) setBasket(await r.json());
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    loadBasket();
    fetch("/api/payment-options").then((r) => r.json()).then((d) => {
      const opts = (d.options ?? DEFAULT_PAYMENT_OPTIONS) as PaymentOptionsConfig;
      setPayOpts(opts);
      setPayOption(ORDER.find((k) => opts[k]) ?? "pay_now");
    }).catch(() => {});
  }, [loadBasket]);

  const search = useCallback(async (term: string) => {
    setSearching(true);
    try {
      const r = await fetch(`/api/agent/products?search=${encodeURIComponent(term)}`);
      if (r.ok) setHits(((await r.json()).products ?? []) as ProductHit[]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (q.trim()) search(q.trim()); else setHits([]); }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  async function addProduct(p: ProductHit) {
    setErr("");
    const r = await fetchWithCsrf("/api/agent/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, items: [{ productId: p.id, quantity: p.packSize * (p.minPacks ?? 1) }] }),
    });
    if (r.ok) setBasket(await r.json());
    else setErr((await r.json()).error ?? "Could not add");
  }

  async function setPacks(productId: string, packs: number) {
    setErr("");
    const r = await fetchWithCsrf("/api/agent/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, productId, packs: Math.max(0, packs) }),
    });
    if (r.ok) setBasket(await r.json());
    else setErr((await r.json()).error ?? "Could not update");
  }

  async function place() {
    setErr("");
    if (basket.items.length === 0) { setErr("Basket is empty."); return; }
    if (!signature) { setErr("The customer needs to sign before placing the order."); return; }
    if (!basket.orderId) { setErr("No order to place."); return; }
    setPlacing(true);
    try {
      const r = await fetchWithCsrf(`/api/agent/orders/${basket.orderId}/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: signature, paymentOption: payOption, specialInstructions: instructions.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error ?? "Failed to place order"); return; }
      if (data.redirectUrl) window.location.href = data.redirectUrl; // Stripe (card/Apple Pay/Klarna)
      else router.push(`/agent?placed=${basket.orderId}`);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <Link href="/agent" className="text-sm text-gray-500 hover:text-gray-900">&larr; My customers</Link>
      <h1 className="font-serif text-2xl text-gray-900 mt-2 mb-4">Build order</h1>

      {/* Product search */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products by name, SKU, or colour…" className="w-full px-3 py-2 border border-gray-200 rounded text-sm" />
        {searching && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
        {hits.length > 0 && (
          <ul className="mt-2 divide-y divide-gray-100 border border-gray-100 rounded-lg max-h-72 overflow-auto">
            {hits.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{p.name} <span className="text-gray-400">· {p.colour}</span></p>
                  <p className="text-xs text-gray-500">{p.sku} · pack {p.packSize} · {p.available} avail{p.pricePerPiece != null ? ` · £${p.pricePerPiece.toFixed(2)}/pc` : ""}</p>
                </div>
                <button type="button" onClick={() => addProduct(p)} className="px-2.5 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 shrink-0">Add pack</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Basket */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Basket</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : basket.items.length === 0 ? (
          <p className="text-sm text-gray-500">No items yet — search above to add packs. (Scanning comes next phase.)</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {basket.items.map((i) => (
              <li key={i.productId} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{i.name} <span className="text-gray-400">· {i.colour}</span></p>
                  <p className="text-xs text-gray-500">{i.sku} · {i.quantity} pcs{i.pricePerPiece != null ? ` · £${i.lineTotal.toFixed(2)}` : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setPacks(i.productId, i.packs - 1)} className="w-7 h-7 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">−</button>
                  <span className="w-10 text-center text-sm">{i.packs}</span>
                  <button type="button" onClick={() => setPacks(i.productId, i.packs + 1)} className="w-7 h-7 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">+</button>
                  <button type="button" onClick={() => setPacks(i.productId, 0)} className="ml-1 text-xs text-red-600 hover:underline">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {basket.items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold">
            <span>Total (ex VAT)</span><span>£{basket.total.toFixed(2)}</span>
          </div>
        )}
      </section>

      {/* Payment + sign + place */}
      {basket.items.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Payment</h2>
            <div className="space-y-1.5">
              {ORDER.filter((k) => payOpts[k]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="pay" checked={payOption === k} onChange={() => setPayOption(k)} />
                  {PAYMENT_OPTION_LABELS[k]}
                </label>
              ))}
            </div>
            {payOption !== "pay_later" && <p className="text-xs text-gray-500 mt-1">The customer pays on this device (card / Apple Pay / Google Pay / Klarna).</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Special instructions (optional)</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} maxLength={2000} className="w-full px-3 py-2 border border-gray-200 rounded text-sm resize-y" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Customer signature</h2>
            <SignaturePad onChange={setSignature} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button type="button" onClick={place} disabled={placing || !signature} className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-40">
            {placing ? "Placing…" : payOption === "pay_later" ? `Place order (invoice) — £${basket.total.toFixed(2)}` : `Place & take payment — £${basket.total.toFixed(2)}`}
          </button>
        </section>
      )}
    </div>
  );
}
