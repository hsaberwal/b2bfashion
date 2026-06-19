/**
 * Outbound email notifications for the admin team. Uses the existing
 * Resend integration. Recipients are resolved in priority order:
 *   1. the DB-managed list (edited via admin Settings)
 *   2. the ADMIN_NOTIFICATION_EMAILS env var (comma-separated, legacy fallback)
 *   3. every admin user in the DB
 */

import { Resend } from "resend";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getStoredRecipients } from "@/lib/notificationRecipients";

/** A PDF attachment for an outbound email (Resend accepts a Buffer as content). */
export type EmailAttachment = { filename: string; content: Buffer };

type NewOrderEmail = {
  orderId: string;
  orderShortCode: string;
  customerName?: string;
  customerCompany?: string;
  customerEmail?: string;
  total: number;
  paymentOption: string;
  paymentStatus: string;
  itemCount: number;
  signedAt: Date;
  /** When present, the order sales sheet PDF is attached to the admin email. */
  attachment?: EmailAttachment;
};

async function getRecipients(): Promise<string[]> {
  // 1. DB-managed list (edited via admin Settings) takes precedence.
  try {
    const stored = await getStoredRecipients();
    if (stored.length > 0) return stored;
  } catch {
    // fall through to env / admin-user fallbacks
  }
  // 2. Legacy env var fallback.
  const fromEnv = (process.env.ADMIN_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  // 3. Fall back to every admin user.
  try {
    await connectDB();
    const admins = await User.find({ role: "admin" }).select("email").lean();
    return admins.map((a) => (a as unknown as { email: string }).email).filter(Boolean);
  } catch {
    return [];
  }
}

function formatGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

function paymentLabel(option: string, status: string): string {
  if (option === "pay_now") return status === "paid" ? "Paid in full" : "Pay in full (awaiting Stripe)";
  if (option === "pay_deposit") return status === "paid" ? "10% deposit paid" : "10% deposit (awaiting Stripe)";
  if (option === "pay_later") return "On credit (invoice)";
  return option;
}

export async function sendNewOrderEmail(data: NewOrderEmail): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.log("[new-order email skipped — EMAIL_API_KEY or EMAIL_FROM missing]", data);
    }
    return;
  }

  const recipients = await getRecipients();
  if (recipients.length === 0) {
    console.warn("[new-order email] no admin recipients configured");
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://claudia-c.com";
  const orderUrl = `${baseUrl}/admin/orders/${data.orderId}`;

  const customer = [data.customerName, data.customerCompany].filter(Boolean).join(" · ") || data.customerEmail || "Customer";

  const subject = `New order ${data.orderShortCode} — ${formatGBP(data.total)} — ${customer}`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px;">
      <h2 style="margin: 0 0 8px;">New order signed</h2>
      <p style="color: #555; margin: 0 0 16px;">A customer just signed an order on Claudia.C B2B.</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 4px 0; color: #888;">Order</td><td style="padding: 4px 0;"><strong>${data.orderShortCode}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: #888;">Customer</td><td style="padding: 4px 0;">${customer}</td></tr>
        ${data.customerEmail ? `<tr><td style="padding: 4px 0; color: #888;">Email</td><td style="padding: 4px 0;">${data.customerEmail}</td></tr>` : ""}
        <tr><td style="padding: 4px 0; color: #888;">Items</td><td style="padding: 4px 0;">${data.itemCount}</td></tr>
        <tr><td style="padding: 4px 0; color: #888;">Total</td><td style="padding: 4px 0;"><strong>${formatGBP(data.total)}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: #888;">Payment</td><td style="padding: 4px 0;">${paymentLabel(data.paymentOption, data.paymentStatus)}</td></tr>
        <tr><td style="padding: 4px 0; color: #888;">Signed</td><td style="padding: 4px 0;">${data.signedAt.toLocaleString("en-GB")}</td></tr>
      </table>
      <p style="margin-top: 20px;">
        <a href="${orderUrl}" style="display: inline-block; background: #111; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px;">View order</a>
      </p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
      ...(data.attachment
        ? { attachments: [{ filename: data.attachment.filename, content: data.attachment.content }] }
        : {}),
    });
  } catch (err) {
    console.error("[new-order email] send failed:", err);
  }
}

type CustomerOrderEmail = {
  to: string;
  customerName?: string;
  orderShortCode: string;
  total: number;
  itemCount: number;
  attachment?: EmailAttachment;
};

/**
 * Send the customer their own copy of the signed order, with the sales-sheet
 * PDF attached. Fire-and-forget: errors are swallowed so a Resend hiccup never
 * breaks the customer's sign action.
 */
export async function sendCustomerOrderEmail(data: CustomerOrderEmail): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.log("[customer-order email skipped — EMAIL_API_KEY or EMAIL_FROM missing]", { to: data.to, order: data.orderShortCode });
    }
    return;
  }
  if (!data.to) return;

  const greeting = data.customerName ? `Hi ${data.customerName},` : "Hello,";
  const subject = `Your Claudia.C order ${data.orderShortCode} — confirmation`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px;">
      <h2 style="margin: 0 0 8px;">Thank you for your order</h2>
      <p style="color: #555; margin: 0 0 16px;">${greeting}</p>
      <p style="color: #555; margin: 0 0 16px;">
        We've received your signed order. A copy of your sales order sheet is attached to this email as a PDF.
        Our team will be in touch about despatch.
      </p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 4px 0; color: #888;">Order</td><td style="padding: 4px 0;"><strong>${data.orderShortCode}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: #888;">Items</td><td style="padding: 4px 0;">${data.itemCount}</td></tr>
        <tr><td style="padding: 4px 0; color: #888;">Total (ex VAT)</td><td style="padding: 4px 0;"><strong>${formatGBP(data.total)}</strong></td></tr>
      </table>
      <p style="color: #888; font-size: 12px; margin-top: 24px;">
        Claudia.C · 32-34 Sampson Road North, B11 1BL · Tel: 0121 693 6030
      </p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: data.to,
      subject,
      html,
      ...(data.attachment
        ? { attachments: [{ filename: data.attachment.filename, content: data.attachment.content }] }
        : {}),
    });
  } catch (err) {
    console.error("[customer-order email] send failed:", err);
  }
}

type ItemRemovedEmail = {
  customerEmail?: string;
  customerName?: string;
  orderShortCode: string;
  removedDescription: string; // e.g. "Floral Tea Dress (TEAL) — 1 pack"
  creditType?: "balance" | "refund";
  creditAmount: number;
  summary: { paid: number; credited: number; refundOwed: number; balanceDue: number };
  attachment?: EmailAttachment; // the revised invoice PDF
};

/**
 * Notify the customer (and the admin team) that a pack was removed from a live
 * order, attaching the revised invoice. Fire-and-forget: errors are swallowed.
 */
export async function sendItemRemovedEmail(data: ItemRemovedEmail): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.log("[item-removed email skipped — EMAIL_API_KEY or EMAIL_FROM missing]", data);
    }
    return;
  }

  const attachments = data.attachment
    ? [{ filename: data.attachment.filename, content: data.attachment.content }]
    : undefined;

  const creditLine =
    data.creditAmount > 0
      ? data.creditType === "refund"
        ? `<tr><td style="padding:4px 0;color:#888;">Refund to be issued</td><td style="padding:4px 0;"><strong>${formatGBP(data.creditAmount)}</strong></td></tr>`
        : `<tr><td style="padding:4px 0;color:#888;">Credited to your account</td><td style="padding:4px 0;"><strong>${formatGBP(data.creditAmount)}</strong></td></tr>`
      : "";

  const summaryRows = `
    <tr><td style="padding:4px 0;color:#888;">Paid</td><td style="padding:4px 0;">${formatGBP(data.summary.paid)}</td></tr>
    ${data.summary.credited > 0 ? `<tr><td style="padding:4px 0;color:#888;">Credited</td><td style="padding:4px 0;">${formatGBP(data.summary.credited)}</td></tr>` : ""}
    ${data.summary.refundOwed > 0 ? `<tr><td style="padding:4px 0;color:#888;">Refund owed</td><td style="padding:4px 0;">${formatGBP(data.summary.refundOwed)}</td></tr>` : ""}
    <tr><td style="padding:4px 0;color:#888;">Balance due</td><td style="padding:4px 0;"><strong>${formatGBP(data.summary.balanceDue)}</strong></td></tr>
  `;

  const greeting = data.customerName ? `Hi ${data.customerName},` : "Hello,";
  const subject = `Update to your Claudia.C order ${data.orderShortCode}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px;">
      <h2 style="margin: 0 0 8px;">An item on your order has changed</h2>
      <p style="color: #555; margin: 0 0 16px;">${greeting}</p>
      <p style="color: #555; margin: 0 0 16px;">
        We've had to remove the following from order <strong>${data.orderShortCode}</strong>, so it
        <strong>will not be shipped</strong> with the rest of your packs:
      </p>
      <p style="margin: 0 0 16px; padding: 10px 12px; background:#f6f6f6; border-radius:6px;">${data.removedDescription}</p>
      <table style="border-collapse: collapse; width: 100%;">
        ${creditLine}
        ${summaryRows}
      </table>
      <p style="color: #555; margin: 16px 0;">A revised invoice is attached. Please get in touch if you have any questions.</p>
      <p style="color: #888; font-size: 12px; margin-top: 24px;">
        Claudia.C · 32-34 Sampson Road North, B11 1BL · Tel: 0121 693 6030
      </p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const adminRecipients = await getRecipients();
    const to = [...new Set([data.customerEmail, ...adminRecipients].filter(Boolean))] as string[];
    if (to.length === 0) return;
    await resend.emails.send({ from, to, subject, html, ...(attachments ? { attachments } : {}) });
  } catch (err) {
    console.error("[item-removed email] send failed:", err);
  }
}
