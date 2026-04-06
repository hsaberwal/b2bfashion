"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type PaymentResult = {
  status: string;
  paymentOption: string;
  paymentStatus: string;
  amountPaid?: number;
  depositAmount?: number;
  depositPaid?: boolean;
};

function CheckoutResult() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const worldpayStatus = searchParams.get("status");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const url = worldpayStatus
      ? `/api/orders/${orderId}/payment-status?worldpayStatus=${worldpayStatus}`
      : `/api/orders/${orderId}/payment-status`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setResult(null);
        else setResult(d);
      })
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [orderId, worldpayStatus]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-je-muted">Processing payment...</p>
      </main>
    );
  }

  if (!orderId || !result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl text-je-black mb-4">Order Not Found</h1>
          <p className="text-je-muted mb-8">We couldn&apos;t find this order. Please check your orders page.</p>
          <Link href="/cart" className="btn-primary">View Orders</Link>
        </div>
      </main>
    );
  }

  const isSuccess = result.paymentStatus === "paid";
  const isFailed = result.paymentStatus === "failed";
  const isPending = result.paymentStatus === "pending";
  const isInvoice = result.paymentOption === "pay_later";

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        {(isSuccess || isInvoice) && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl text-je-black mb-3">
              {isInvoice ? "Order Confirmed" : "Payment Successful"}
            </h1>
            <p className="text-je-muted mb-2">
              {isInvoice
                ? "Your order has been confirmed. An invoice will be sent to you."
                : result.paymentOption === "pay_deposit"
                  ? `Your 10% deposit of £${result.amountPaid?.toFixed(2)} has been paid.`
                  : `Payment of £${result.amountPaid?.toFixed(2)} received.`}
            </p>
          </>
        )}

        {isFailed && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl text-je-black mb-3">Payment Failed</h1>
            <p className="text-je-muted mb-6">
              Your payment could not be processed. Please try again or choose a different payment method.
            </p>
          </>
        )}

        {isPending && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl text-je-black mb-3">Payment Processing</h1>
            <p className="text-je-muted mb-6">
              Your payment is being processed. We&apos;ll update your order once it&apos;s confirmed.
            </p>
          </>
        )}

        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <Link href="/cart" className="btn-primary">View Orders</Link>
          <Link href="/products" className="btn-outline">Continue Shopping</Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-je-muted">Processing payment...</p>
      </main>
    }>
      <CheckoutResult />
    </Suspense>
  );
}
