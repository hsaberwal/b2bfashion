/**
 * Which checkout payment options are enabled, controlled by admins in Settings.
 *
 * Stored as a single SiteContent document under PAYMENT_OPTIONS_KEY:
 *   { pay_now: boolean, pay_deposit: boolean, pay_later: boolean }
 *
 * Default (and the launch state requested by the business): only pay-in-full is
 * on. Admins can switch the 10% deposit and invoice/pay-later options back on.
 */

export const PAYMENT_OPTIONS_KEY = "paymentOptions";

export type PaymentOptionKey = "pay_now" | "pay_deposit" | "pay_later";

export type PaymentOptionsConfig = Record<PaymentOptionKey, boolean>;

export const DEFAULT_PAYMENT_OPTIONS: PaymentOptionsConfig = {
  pay_now: true,
  pay_deposit: false,
  pay_later: false,
};

export const PAYMENT_OPTION_LABELS: Record<PaymentOptionKey, string> = {
  pay_now: "Pay in full (card)",
  pay_deposit: "Pay 10% deposit",
  pay_later: "Invoice (pay later)",
};

const KEYS: PaymentOptionKey[] = ["pay_now", "pay_deposit", "pay_later"];

/**
 * Coerce arbitrary stored/posted JSON into a safe config. `pay_now` is forced on
 * whenever the stored config would otherwise leave checkout with no option, so a
 * customer can always pay.
 */
export function normalizePaymentOptions(raw: unknown): PaymentOptionsConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<PaymentOptionKey, unknown>>;
  const cfg: PaymentOptionsConfig = {
    pay_now: obj.pay_now === undefined ? DEFAULT_PAYMENT_OPTIONS.pay_now : Boolean(obj.pay_now),
    pay_deposit: Boolean(obj.pay_deposit),
    pay_later: Boolean(obj.pay_later),
  };
  if (!KEYS.some((k) => cfg[k])) cfg.pay_now = true;
  return cfg;
}

export function isPaymentOptionEnabled(cfg: PaymentOptionsConfig, option: string): boolean {
  return KEYS.includes(option as PaymentOptionKey) && cfg[option as PaymentOptionKey];
}
