import { connectDB } from "@/lib/mongodb";
import { SiteContent } from "@/models/SiteContent";
import { PAYMENT_OPTIONS_KEY, normalizePaymentOptions, type PaymentOptionsConfig } from "@/lib/paymentOptions";

/** Read the admin-configured payment options from the DB (normalised, with safe defaults). */
export async function getEnabledPaymentOptions(): Promise<PaymentOptionsConfig> {
  await connectDB();
  const doc = (await SiteContent.findOne({ key: PAYMENT_OPTIONS_KEY }).lean()) as { content?: unknown } | null;
  return normalizePaymentOptions(doc?.content);
}
