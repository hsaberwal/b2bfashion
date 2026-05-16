import { describe, expect, it } from "vitest";
import {
  FULFILMENT_STEPS,
  STATUS_LABEL,
  STATUS_SHORT_LABEL,
  nextStatus,
  isAfter,
  isAtOrAfter,
  type OrderStatus,
} from "./orderStatus";

describe("FULFILMENT_STEPS", () => {
  it("is in the canonical order", () => {
    expect(FULFILMENT_STEPS).toEqual([
      "signed",
      "confirmed",
      "picked",
      "ready_to_ship",
      "shipped",
      "delivered",
    ]);
  });
});

describe("STATUS_LABEL / STATUS_SHORT_LABEL", () => {
  it("covers every OrderStatus value", () => {
    const all: OrderStatus[] = [
      "pending",
      "signed",
      "confirmed",
      "picked",
      "ready_to_ship",
      "shipped",
      "delivered",
      "cancelled",
    ];
    for (const s of all) {
      expect(STATUS_LABEL[s]).toBeDefined();
      expect(STATUS_SHORT_LABEL[s]).toBeDefined();
    }
  });
});

describe("nextStatus", () => {
  it("returns the next fulfilment step for each in-chain status", () => {
    expect(nextStatus("signed")).toBe("confirmed");
    expect(nextStatus("confirmed")).toBe("picked");
    expect(nextStatus("picked")).toBe("ready_to_ship");
    expect(nextStatus("ready_to_ship")).toBe("shipped");
    expect(nextStatus("shipped")).toBe("delivered");
  });

  it("returns null at the end of the chain", () => {
    expect(nextStatus("delivered")).toBeNull();
  });

  it("returns null for terminal/off-chain statuses", () => {
    expect(nextStatus("cancelled")).toBeNull();
    expect(nextStatus("pending")).toBeNull();
  });
});

describe("isAfter", () => {
  it("returns true when current is strictly past target", () => {
    expect(isAfter("shipped", "signed")).toBe(true);
    expect(isAfter("delivered", "picked")).toBe(true);
  });

  it("returns false when current equals target", () => {
    expect(isAfter("picked", "picked")).toBe(false);
  });

  it("returns false when current is earlier than target", () => {
    expect(isAfter("signed", "shipped")).toBe(false);
  });

  it("returns false for off-chain statuses", () => {
    // STEP_INDEX maps cancelled/pending to -1, so neither is "after" any step.
    expect(isAfter("cancelled", "signed")).toBe(false);
    expect(isAfter("pending", "signed")).toBe(false);
  });
});

describe("isAtOrAfter", () => {
  it("returns true at the matching step", () => {
    expect(isAtOrAfter("picked", "picked")).toBe(true);
  });

  it("returns true past the step", () => {
    expect(isAtOrAfter("shipped", "confirmed")).toBe(true);
  });

  it("returns false before the step", () => {
    expect(isAtOrAfter("signed", "shipped")).toBe(false);
  });

  it("returns false for off-chain statuses against any in-chain target", () => {
    expect(isAtOrAfter("cancelled", "signed")).toBe(false);
    expect(isAtOrAfter("pending", "signed")).toBe(false);
  });
});
