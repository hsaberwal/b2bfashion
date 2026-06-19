import { describe, it, expect } from "vitest";
import {
  normalizePaymentOptions,
  isPaymentOptionEnabled,
  DEFAULT_PAYMENT_OPTIONS,
} from "./paymentOptions";

describe("normalizePaymentOptions", () => {
  it("returns the default (pay-in-full only) for null/garbage", () => {
    expect(normalizePaymentOptions(null)).toEqual(DEFAULT_PAYMENT_OPTIONS);
    expect(normalizePaymentOptions("nope")).toEqual(DEFAULT_PAYMENT_OPTIONS);
  });

  it("coerces stored booleans", () => {
    expect(normalizePaymentOptions({ pay_now: true, pay_deposit: true, pay_later: false })).toEqual({
      pay_now: true,
      pay_deposit: true,
      pay_later: false,
    });
  });

  it("forces pay_now on when the config would otherwise enable nothing", () => {
    expect(normalizePaymentOptions({ pay_now: false, pay_deposit: false, pay_later: false }).pay_now).toBe(true);
  });

  it("allows pay_now off when another option is on", () => {
    const cfg = normalizePaymentOptions({ pay_now: false, pay_later: true });
    expect(cfg.pay_now).toBe(false);
    expect(cfg.pay_later).toBe(true);
  });

  it("isPaymentOptionEnabled checks membership + flag", () => {
    const cfg = normalizePaymentOptions({ pay_now: true, pay_deposit: false });
    expect(isPaymentOptionEnabled(cfg, "pay_now")).toBe(true);
    expect(isPaymentOptionEnabled(cfg, "pay_deposit")).toBe(false);
    expect(isPaymentOptionEnabled(cfg, "bogus")).toBe(false);
  });
});
