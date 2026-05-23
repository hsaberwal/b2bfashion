/**
 * Order-notification recipients, stored in the database so admins can manage
 * them from the admin UI instead of editing a Railway env var. Persisted as a
 * single SiteContent document keyed by ORDER_NOTIFICATIONS_KEY.
 */

import { connectDB } from "@/lib/mongodb";
import { SiteContent } from "@/models/SiteContent";

export const ORDER_NOTIFICATIONS_KEY = "orderNotifications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Trim, lowercase, validate, and de-duplicate a list of email addresses. */
export function normalizeEmails(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const email = raw.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export async function getStoredRecipients(): Promise<string[]> {
  await connectDB();
  const doc = (await SiteContent.findOne({ key: ORDER_NOTIFICATIONS_KEY }).lean()) as
    | { content?: { emails?: unknown } }
    | null;
  const emails = doc?.content?.emails;
  if (!Array.isArray(emails)) return [];
  return emails.filter((e): e is string => typeof e === "string");
}

/** Validate + normalize, persist, and return the cleaned list. */
export async function setStoredRecipients(emails: string[]): Promise<string[]> {
  const clean = normalizeEmails(emails);
  await connectDB();
  await SiteContent.findOneAndUpdate(
    { key: ORDER_NOTIFICATIONS_KEY },
    { content: { emails: clean } },
    { upsert: true }
  );
  return clean;
}
