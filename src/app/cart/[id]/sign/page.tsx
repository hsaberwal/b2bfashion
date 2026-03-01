"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Order = {
  id: string;
  items: { productId: string; sku: string; quantity: number; pricePerItem?: number; size?: string }[];
  status: string;
};

type DeliverySnapshot = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country: string;
  vatNumber?: string;
  companyName?: string;
};

export default function SignOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [user, setUser] = useState<{ deliveryAddress?: DeliverySnapshot; vatNumber?: string; companyName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"pay_now" | "pay_later">("pay_later");
  const [delivery, setDelivery] = useState<DeliverySnapshot>({
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    vatNumber: "",
    companyName: "",
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/auth/session").then((r) => r.json()),
    ]).then(([ordersRes, sessionRes]) => {
      const o = (ordersRes.orders ?? []).find((x: Order) => x.id === orderId);
      setOrder(o ?? null);
      const u = sessionRes.user;
      setUser(u ?? null);
      if (u?.deliveryAddress) {
        setDelivery((d) => ({
          addressLine1: u.deliveryAddress?.addressLine1 ?? d.addressLine1,
          addressLine2: u.deliveryAddress?.addressLine2 ?? d.addressLine2,
          city: u.deliveryAddress?.city ?? d.city,
          postcode: u.deliveryAddress?.postcode ?? d.postcode,
          country: u.deliveryAddress?.country ?? d.country,
          vatNumber: u.vatNumber ?? d.vatNumber,
          companyName: u.companyName ?? d.companyName,
        }));
      } else if (u) {
        setDelivery((d) => ({
          ...d,
          vatNumber: u.vatNumber ?? "",
          companyName: u.companyName ?? "",
        }));
      }
    }).finally(() => setLoading(false));
  }, [orderId]);

  function getCanvas(): HTMLCanvasElement | null {
    return canvasRef.current;
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  const orderTotal = order?.items?.reduce((sum, i) => sum + (i.pricePerItem ?? 0) * i.quantity, 0) ?? 0;
  const depositAmount = Math.round(orderTotal * 0.1 * 100) / 100;

  function deliveryValid() {
    return !!(
      delivery.addressLine1?.trim() &&
      delivery.city?.trim() &&
      delivery.postcode?.trim() &&
      delivery.country?.trim()
    );
  }

  async function submitSignature() {
    if (!deliveryValid()) {
      setError("Please fill in delivery address (address line 1, city, postcode, country).");
      return;
    }
    const canvas = getCanvas();
    if (!canvas || !hasSignature) {
      setError("Please draw your signature in the box below.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    setSigning(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl: dataUrl,
          deliverySnapshot: {
            addressLine1: delivery.addressLine1!.trim(),
            addressLine2: delivery.addressLine2?.trim() || undefined,
            city: delivery.city!.trim(),
            postcode: delivery.postcode!.trim(),
            country: delivery.country!.trim(),
            vatNumber: delivery.vatNumber?.trim() || undefined,
            companyName: delivery.companyName?.trim() || undefined,
          },
          paymentOption,
          depositAmount: orderTotal > 0 ? depositAmount : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to sign order");
        return;
      }
      router.push("/cart");
    } finally {
      setSigning(false);
    }
  }

  if (loading || !order) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-je-cream">
        <Link href="/cart" className="text-sm text-je-muted hover:underline mb-4 inline-block">
          ← Back to orders
        </Link>
        <p className="text-je-muted">{loading ? "Loading…" : "Order not found."}</p>
      </main>
    );
  }

  if (order.status !== "pending") {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-je-cream">
        <Link href="/cart" className="text-sm text-je-muted hover:underline mb-4 inline-block">
          ← Back to orders
        </Link>
        <p className="text-je-muted">This order is already signed or cancelled.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-je-cream">
      <Link href="/cart" className="text-sm text-je-muted hover:underline mb-4 inline-block">
        ← Back to orders
      </Link>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-je-black tracking-tight mb-2">
          Checkout — delivery & sign
        </h1>
        <p className="text-je-muted text-sm mb-6">
          Enter delivery details, then sign to accept. You can save your details in <Link href="/account" className="text-je-black font-medium underline">Your account</Link> for next time.
        </p>

        {/* Delivery details (required before signing) */}
        <section className="mb-6 border border-je-border p-4 bg-je-white">
          <h2 className="text-sm font-semibold text-je-black mb-3">Delivery details *</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-je-muted mb-0.5">Address line 1</label>
              <input
                type="text"
                value={delivery.addressLine1}
                onChange={(e) => setDelivery((d) => ({ ...d, addressLine1: e.target.value }))}
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black text-sm"
                required
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-xs text-je-muted mb-0.5">Address line 2</label>
              <input
                type="text"
                value={delivery.addressLine2}
                onChange={(e) => setDelivery((d) => ({ ...d, addressLine2: e.target.value }))}
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black text-sm"
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-je-muted mb-0.5">City</label>
                <input
                  type="text"
                  value={delivery.city}
                  onChange={(e) => setDelivery((d) => ({ ...d, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-je-muted mb-0.5">Postcode</label>
                <input
                  type="text"
                  value={delivery.postcode}
                  onChange={(e) => setDelivery((d) => ({ ...d, postcode: e.target.value }))}
                  className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-je-muted mb-0.5">Country</label>
              <input
                type="text"
                value={delivery.country}
                onChange={(e) => setDelivery((d) => ({ ...d, country: e.target.value }))}
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-je-muted mb-0.5">Company name</label>
              <input
                type="text"
                value={delivery.companyName}
                onChange={(e) => setDelivery((d) => ({ ...d, companyName: e.target.value }))}
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-je-muted mb-0.5">VAT number</label>
              <input
                type="text"
                value={delivery.vatNumber}
                onChange={(e) => setDelivery((d) => ({ ...d, vatNumber: e.target.value }))}
                placeholder="e.g. GB123456789"
                className="w-full px-3 py-2 border border-je-border bg-je-white text-je-black text-sm"
              />
            </div>
          </div>
        </section>

        {/* Order summary */}
        <section className="mb-4 border border-je-border p-4 bg-je-white">
          <p className="text-sm font-medium text-je-black mb-2">Order summary</p>
          <ul className="text-sm text-je-muted space-y-1">
            {order.items.map((item, i) => (
              <li key={i}>
                {item.sku}
                {item.size ? ` · ${item.size}` : ""} × {item.quantity}
                {item.pricePerItem != null && (
                  <span className="screenshot-protected ml-2 text-je-charcoal">
                    £{(item.pricePerItem * item.quantity).toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {orderTotal > 0 && (
            <p className="mt-2 text-sm text-je-black screenshot-protected">
              Total: £{orderTotal.toFixed(2)} · 10% deposit: £{depositAmount.toFixed(2)}
            </p>
          )}
        </section>

        {/* Pay now / Pay later */}
        <section className="mb-4 border border-je-border p-4 bg-je-white">
          <p className="text-sm font-medium text-je-black mb-2">Payment</p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="payment"
              checked={paymentOption === "pay_later"}
              onChange={() => setPaymentOption("pay_later")}
              className="text-je-black"
            />
            Pay later (10% deposit required)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
            <input
              type="radio"
              name="payment"
              checked={paymentOption === "pay_now"}
              onChange={() => setPaymentOption("pay_now")}
              className="text-je-black"
            />
            Pay now (include 10% deposit)
          </label>
        </section>

        {/* Signature */}
        <section className="mb-4">
          <label className="block text-sm font-medium text-je-black mb-2">Your signature *</label>
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            className="border border-je-border rounded w-full max-w-md bg-je-white text-je-black touch-none"
            style={{ touchAction: "none" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <p className="mt-1 text-xs text-je-muted">Draw in the box above (mouse or touch).</p>
        </section>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="flex gap-4">
          <button
            onClick={submitSignature}
            disabled={signing || !hasSignature}
            className="px-4 py-2 bg-je-black text-je-white font-medium hover:bg-je-charcoal disabled:opacity-50"
          >
            {signing ? "Submitting…" : "Submit — sign order"}
          </button>
          <Link
            href="/cart"
            className="px-4 py-2 border border-je-border bg-je-white text-je-black hover:bg-je-offwhite"
          >
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
