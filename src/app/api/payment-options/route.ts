import { NextResponse } from "next/server";
import { getEnabledPaymentOptions } from "@/lib/paymentOptionsServer";
import { DEFAULT_PAYMENT_OPTIONS } from "@/lib/paymentOptions";

/** GET /api/payment-options — which checkout payment options are enabled (public). */
export async function GET() {
  try {
    const options = await getEnabledPaymentOptions();
    return NextResponse.json({ options });
  } catch (e) {
    console.error("payment-options error:", e);
    // Fail safe: at least allow pay-in-full so checkout never dead-ends.
    return NextResponse.json({ options: DEFAULT_PAYMENT_OPTIONS });
  }
}
