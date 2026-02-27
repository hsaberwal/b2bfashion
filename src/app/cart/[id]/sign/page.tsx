"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Order = {
  id: string;
  items: { productId: string; sku: string; quantity: number; pricePerItem?: number; size?: string }[];
  status: string;
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
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        const o = (d.orders ?? []).find((x: Order) => x.id === orderId);
        setOrder(o ?? null);
      })
      .finally(() => setLoading(false));
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

  async function submitSignature() {
    const canvas = getCanvas();
    if (!canvas || !hasSignature) {
      setError("Please draw your signature in the box above.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    setSigning(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: dataUrl }),
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
      <main className="min-h-screen p-4 md:p-8">
        <Link href="/cart" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to orders
        </Link>
        <p className="text-gray-500">{loading ? "Loading…" : "Order not found."}</p>
      </main>
    );
  }

  if (order.status !== "pending") {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <Link href="/cart" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Back to orders
        </Link>
        <p className="text-gray-500">This order is already signed or cancelled.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <Link href="/cart" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
        ← Back to orders
      </Link>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Sign to accept order
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Draw your signature below to confirm this order. Bulk ordering only — quantities are in pack multiples.
        </p>
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Order summary
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {order.items.map((item, i) => (
              <li key={i}>
                {item.sku}
                {item.size != null && item.size !== "" ? ` · ${item.size}` : ""} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your signature
          </label>
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            className="border border-gray-300 rounded-lg w-full max-w-md bg-white dark:bg-gray-800 dark:border-gray-700 touch-none"
            style={{ touchAction: "none" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <p className="mt-1 text-xs text-gray-500">
            Draw in the box above (mouse or touch).
          </p>
        </div>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="flex gap-4">
          <button
            onClick={submitSignature}
            disabled={signing || !hasSignature}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {signing ? "Submitting…" : "Submit signature"}
          </button>
          <Link
            href="/cart"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
