"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Order = {
  id: string;
  items: { productId: string; sku: string; quantity: number; pricePerPack?: number; packSize?: number; size?: string }[];
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
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"pay_now" | "pay_deposit" | "pay_later">("pay_deposit");
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

  const orderTotal = order?.items?.reduce((sum, i) => sum + (i.pricePerPack ?? 0) * (i.quantity / (i.packSize ?? 1)), 0) ?? 0;
  const depositAmount = Math.round(orderTotal * 0.1 * 100) / 100;

  function deliveryValid() {
    return !!(
      delivery.addressLine1?.trim() &&
      delivery.city?.trim() &&
      delivery.postcode?.trim() &&
      delivery.country?.trim()
    );
  }

  async function submitOrder() {
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
      // Step 1: Sign the order
      const signRes = await fetch(`/api/orders/${orderId}/sign`, {
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
      const signData = await signRes.json();
      if (!signRes.ok) {
        setError(signData.error ?? "Failed to sign order");
        return;
      }

      // Step 2: Initiate payment
      const payRes = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentOption }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setError(payData.error ?? "Payment initiation failed");
        return;
      }

      // Step 3: Redirect to Worldpay or confirmation
      if (payData.redirectUrl) {
        // Redirect to Worldpay hosted payment page
        window.location.href = payData.redirectUrl;
      } else {
        // Invoice / pay later — go to confirmation
        router.push(`/checkout/result?orderId=${orderId}&status=success`);
      }
    } finally {
      setSigning(false);
    }
  }

  if (loading || !order) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-white">
        <Link href="/cart" className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors">
          &larr; Back to orders
        </Link>
        <p className="text-je-muted mt-8">{loading ? "Loading..." : "Order not found."}</p>
      </main>
    );
  }

  if (order.status !== "pending") {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-white">
        <Link href="/cart" className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors">
          &larr; Back to orders
        </Link>
        <p className="text-je-muted mt-8">This order is already signed or cancelled.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-white">
      <Link href="/cart" className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors">
        &larr; Back to orders
      </Link>
      <div className="max-w-lg mx-auto mt-6">
        <h1 className="font-serif text-3xl text-je-black mb-2">Checkout</h1>
        <p className="text-je-muted text-sm mb-8">
          Enter delivery details, choose payment, then sign to confirm.
        </p>

        {/* Delivery details */}
        <section className="mb-8">
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-je-black mb-4">
            Delivery Address
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-je-muted mb-1">Address line 1 *</label>
              <input
                type="text"
                value={delivery.addressLine1}
                onChange={(e) => setDelivery((d) => ({ ...d, addressLine1: e.target.value }))}
                className="w-full px-4 py-2.5 border border-je-border text-sm text-je-black focus:border-je-black focus:outline-none transition-colors"
                required
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-xs text-je-muted mb-1">Address line 2</label>
              <input
                type="text"
                value={delivery.addressLine2}
                onChange={(e) => setDelivery((d) => ({ ...d, addressLine2: e.target.value }))}
                className="w-full px-4 py-2.5 border border-je-border text-sm text-je-black focus:border-je-black focus:outline-none transition-colors"
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-je-muted mb-1">City *</label>
                <input
                  type="text"
                  value={delivery.city}
                  onChange={(e) => setDelivery((d) => ({ ...d, city: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-je-border text-sm text-je-black focus:border-je-black focus:outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-je-muted mb-1">Postcode *</label>
                <input
                  type="text"
                  value={delivery.postcode}
                  onChange={(e) => setDelivery((d) => ({ ...d, postcode: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-je-border text-sm text-je-black focus:border-je-black focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-je-muted mb-1">Country *</label>
              <input
                type="text"
                value={delivery.country}
                onChange={(e) => setDelivery((d) => ({ ...d, country: e.target.value }))}
                className="w-full px-4 py-2.5 border border-je-border text-sm text-je-black focus:border-je-black focus:outline-none transition-colors"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-je-muted mb-1">Company name</label>
                <input
                  type="text"
                  value={delivery.companyName}
                  onChange={(e) => setDelivery((d) => ({ ...d, companyName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-je-border text-sm text-je-black focus:border-je-black focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-je-muted mb-1">VAT number</label>
                <input
                  type="text"
                  value={delivery.vatNumber}
                  onChange={(e) => setDelivery((d) => ({ ...d, vatNumber: e.target.value }))}
                  placeholder="e.g. GB123456789"
                  className="w-full px-4 py-2.5 border border-je-border text-sm text-je-black focus:border-je-black focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Order summary */}
        <section className="mb-8 border-t border-je-border pt-6">
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-je-black mb-4">
            Order Summary
          </h2>
          <ul className="text-sm text-je-muted space-y-2">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {item.sku}{item.size ? ` · ${item.size}` : ""} &times; {item.quantity}
                </span>
                {item.pricePerPack != null && (
                  <span className="screenshot-protected text-je-black font-medium">
                    £{(item.pricePerPack * (item.quantity / (item.packSize ?? 1))).toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {orderTotal > 0 && (
            <div className="mt-4 pt-4 border-t border-je-border">
              <div className="flex justify-between text-sm">
                <span className="text-je-muted">Order total</span>
                <span className="screenshot-protected text-je-black font-semibold text-base">
                  £{orderTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-je-muted">10% deposit</span>
                <span className="screenshot-protected text-je-muted">
                  £{depositAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Payment options */}
        <section className="mb-8 border-t border-je-border pt-6">
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-je-black mb-4">
            Payment Method
          </h2>
          <div className="space-y-3">
            <label
              className={`flex items-start gap-4 p-4 border rounded cursor-pointer transition-all ${
                paymentOption === "pay_now"
                  ? "border-je-black bg-je-offwhite"
                  : "border-je-border hover:border-je-charcoal"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentOption === "pay_now"}
                onChange={() => setPaymentOption("pay_now")}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-je-black">Pay in full</p>
                <p className="text-xs text-je-muted mt-0.5">
                  Pay the full amount of £{orderTotal.toFixed(2)} now via Worldpay
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-4 p-4 border rounded cursor-pointer transition-all ${
                paymentOption === "pay_deposit"
                  ? "border-je-black bg-je-offwhite"
                  : "border-je-border hover:border-je-charcoal"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentOption === "pay_deposit"}
                onChange={() => setPaymentOption("pay_deposit")}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-je-black">Pay 10% deposit</p>
                <p className="text-xs text-je-muted mt-0.5">
                  Pay £{depositAmount.toFixed(2)} now, remaining balance on delivery
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-4 p-4 border rounded cursor-pointer transition-all ${
                paymentOption === "pay_later"
                  ? "border-je-black bg-je-offwhite"
                  : "border-je-border hover:border-je-charcoal"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentOption === "pay_later"}
                onChange={() => setPaymentOption("pay_later")}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-je-black">Invoice (pay later)</p>
                <p className="text-xs text-je-muted mt-0.5">
                  We&apos;ll send an invoice. Payment due on delivery.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Signature */}
        <section className="mb-6 border-t border-je-border pt-6">
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-je-black mb-4">
            Signature
          </h2>
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            className="border border-je-border w-full max-w-md bg-je-offwhite touch-none"
            style={{ touchAction: "none" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <p className="mt-2 text-xs text-je-muted">Sign in the box above to confirm your order.</p>
        </section>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="flex gap-4 mb-12">
          <button
            onClick={submitOrder}
            disabled={signing || !hasSignature}
            className="flex-1 py-4 bg-je-black text-white text-[11px] uppercase tracking-widest font-semibold
                       hover:bg-je-charcoal disabled:opacity-40 transition-all duration-300"
          >
            {signing
              ? "Processing..."
              : paymentOption === "pay_later"
                ? "Confirm Order"
                : paymentOption === "pay_deposit"
                  ? `Pay Deposit — £${depositAmount.toFixed(2)}`
                  : `Pay Now — £${orderTotal.toFixed(2)}`}
          </button>
          <Link
            href="/cart"
            className="px-6 py-4 border border-je-border text-je-black text-[11px] uppercase tracking-widest font-semibold
                       hover:bg-je-offwhite transition-all duration-300 flex items-center"
          >
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
