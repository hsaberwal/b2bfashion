/**
 * Signup hygiene helpers — disposable domain blocklist, MX record check, and
 * the shared verification window constant used by register, verify, and cleanup.
 */

import { promises as dns } from "dns";

export const VERIFICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const VERIFICATION_WINDOW_LABEL = "15 minutes";

// Top throwaway email providers. Kept small and inline to avoid a runtime dependency.
// Add to this list as new spam sources are observed.
const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "yopmail.fr",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "trashmail.com",
  "trashmail.de",
  "getnada.com",
  "nada.email",
  "throwawaymail.com",
  "maildrop.cc",
  "fakeinbox.com",
  "spam4.me",
  "disposable.com",
  "dispostable.com",
  "mohmal.com",
  "mintemail.com",
  "mailcatch.com",
  "mailnesia.com",
  "inboxbear.com",
  "inboxkitten.com",
  "emailondeck.com",
  "tempinbox.com",
  "tempr.email",
  "tempail.com",
  "burnermail.io",
  "mail.tm",
  "moakt.com",
  "mytemp.email",
  "anonaddy.me",
  "dropmail.me",
  "getairmail.com",
  "mailpoof.com",
  "mailnull.com",
  "spambog.com",
  "trash-mail.com",
  "deadaddress.com",
  "fakemail.net",
  "mvrht.net",
  "spambox.us",
  "trbvm.com",
]);

function getDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = getDomain(email);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Resolve MX records for the email domain.
 * Returns true if at least one MX record exists. False otherwise.
 * On unexpected errors, returns true (fail-open) so DNS issues don't block legit users.
 */
export async function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = getDomain(email);
  if (!domain) return false;
  try {
    const records = await dns.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // ENOTFOUND / ENODATA = domain has no MX records → reject.
    if (code === "ENOTFOUND" || code === "ENODATA") return false;
    // Other failures (timeout, service errors) → fail open to avoid false rejections.
    return true;
  }
}

/** Canonical rate-limit key for an email (trimmed, lowercased). */
export function emailRateKey(email: string): string {
  return email.trim().toLowerCase();
}
