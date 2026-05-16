import { describe, expect, it } from "vitest";
import {
  calculateOrderTotal,
  calculateDeposit,
  calculatePackPrice,
  sumPayments,
  calculateOutstanding,
} from "./pricing";

describe("calculateOrderTotal", () => {
  it("sums pricePerPiece × quantity across items", () => {
    expect(
      calculateOrderTotal([
        { pricePerPiece: 10, quantity: 2 },
        { pricePerPiece: 5.5, quantity: 4 },
      ]),
    ).toBe(42);
  });

  it("falls back to legacy pricePerPack when pricePerPiece is missing", () => {
    expect(
      calculateOrderTotal([{ pricePerPack: 12, quantity: 3 }]),
    ).toBe(36);
  });

  it("prefers pricePerPiece over pricePerPack when both present", () => {
    expect(
      calculateOrderTotal([{ pricePerPiece: 10, pricePerPack: 99, quantity: 2 }]),
    ).toBe(20);
  });

  it("treats unpriced items as zero (does not throw)", () => {
    expect(calculateOrderTotal([{ quantity: 5 }])).toBe(0);
  });

  it("returns zero for an empty list", () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});

describe("calculateDeposit", () => {
  it("returns 10% of the total", () => {
    expect(calculateDeposit(100)).toBe(10);
    expect(calculateDeposit(250)).toBe(25);
  });

  it("rounds to whole pence", () => {
    // £33.33 × 0.1 = £3.333 → £3.33
    expect(calculateDeposit(33.33)).toBe(3.33);
    // £33.36 × 0.1 = £3.336 → £3.34 (round half up)
    expect(calculateDeposit(33.36)).toBe(3.34);
  });

  it("returns zero for a zero total", () => {
    expect(calculateDeposit(0)).toBe(0);
  });

  it("never produces fractional pence (sub-penny floats are rounded)", () => {
    // 0.1 × 0.1 = 0.010000000000000002 in IEEE 754
    expect(calculateDeposit(0.1)).toBe(0.01);
  });
});

describe("calculatePackPrice", () => {
  it("multiplies pricePerPiece by itemsPerPack", () => {
    expect(calculatePackPrice(12.5, 6)).toBe(75);
  });

  it("returns null when pricePerPiece is missing or non-positive", () => {
    expect(calculatePackPrice(null, 6)).toBeNull();
    expect(calculatePackPrice(undefined, 6)).toBeNull();
    expect(calculatePackPrice(0, 6)).toBeNull();
    expect(calculatePackPrice(-1, 6)).toBeNull();
    expect(calculatePackPrice(NaN, 6)).toBeNull();
  });

  it("returns null when itemsPerPack is missing or non-positive", () => {
    expect(calculatePackPrice(10, null)).toBeNull();
    expect(calculatePackPrice(10, undefined)).toBeNull();
    expect(calculatePackPrice(10, 0)).toBeNull();
    expect(calculatePackPrice(10, -1)).toBeNull();
  });
});

describe("sumPayments", () => {
  it("sums non-refunded payments", () => {
    expect(
      sumPayments([
        { amount: 10 },
        { amount: 20 },
        { amount: 5 },
      ]),
    ).toBe(35);
  });

  it("ignores refunded payments", () => {
    expect(
      sumPayments([
        { amount: 10, refunded: false },
        { amount: 20, refunded: true },
        { amount: 5 },
      ]),
    ).toBe(15);
  });

  it("rounds to whole pence to avoid floating-point drift", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
    expect(sumPayments([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });

  it("returns zero for an empty list", () => {
    expect(sumPayments([])).toBe(0);
  });

  it("treats missing amount as zero (defensive against bad rows)", () => {
    expect(
      sumPayments([{} as { amount: number }, { amount: 5 }]),
    ).toBe(5);
  });
});

describe("calculateOutstanding", () => {
  it("returns total minus paid when positive", () => {
    expect(calculateOutstanding(100, 30)).toBe(70);
  });

  it("clamps overpayment to zero (never negative)", () => {
    expect(calculateOutstanding(100, 120)).toBe(0);
  });

  it("returns zero when fully paid", () => {
    expect(calculateOutstanding(50, 50)).toBe(0);
  });

  it("rounds to whole pence to avoid floating-point dust", () => {
    // 100.10 - 0.10 → exactly 100 (no 99.99999...)
    expect(calculateOutstanding(100.1, 0.1)).toBe(100);
  });

  it("treats zero total as zero outstanding regardless of payments", () => {
    expect(calculateOutstanding(0, 0)).toBe(0);
    expect(calculateOutstanding(0, 5)).toBe(0);
  });
});
