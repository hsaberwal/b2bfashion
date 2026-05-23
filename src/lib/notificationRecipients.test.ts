import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmails } from "./notificationRecipients";

describe("isValidEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("  name@company.co.uk  ")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    for (const bad of ["", "nope", "a@b", "a b@c.com", "@b.com", "a@.com"]) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});

describe("normalizeEmails", () => {
  it("trims, lowercases, validates, and de-duplicates", () => {
    expect(
      normalizeEmails(["  Ops@Example.com ", "ops@example.com", "bad", "warehouse@example.com"])
    ).toEqual(["ops@example.com", "warehouse@example.com"]);
  });

  it("drops invalid and empty entries", () => {
    expect(normalizeEmails(["", "  ", "not-an-email", "good@example.com"])).toEqual([
      "good@example.com",
    ]);
  });

  it("returns an empty array when nothing is valid", () => {
    expect(normalizeEmails(["x", "y@z"])).toEqual([]);
  });
});
