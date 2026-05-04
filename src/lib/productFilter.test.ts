import { describe, expect, it } from "vitest";
import {
  availableOf,
  matchesStatus,
  matchesSearch,
  filterProducts,
  statusCounts,
  type ProductForFilter,
} from "./productFilter";

const makeProduct = (overrides: Partial<ProductForFilter> = {}): ProductForFilter => ({
  name: "Mocha Top",
  sku: "COL13276-MOCHA",
  category: "Top",
  colour: "Mocha",
  packsInStock: 10,
  packsReserved: 0,
  disabled: false,
  ...overrides,
});

describe("availableOf", () => {
  it("returns physical stock minus reserved", () => {
    expect(availableOf({ packsInStock: 10, packsReserved: 3 })).toBe(7);
  });

  it("clamps at zero when reserved exceeds physical", () => {
    expect(availableOf({ packsInStock: 2, packsReserved: 5 })).toBe(0);
  });

  it("treats undefined as zero", () => {
    expect(availableOf({})).toBe(0);
    expect(availableOf({ packsInStock: 5 })).toBe(5);
    expect(availableOf({ packsReserved: 5 })).toBe(0);
  });
});

describe("matchesStatus", () => {
  it("'all' matches everything", () => {
    expect(matchesStatus(makeProduct(), "all")).toBe(true);
    expect(matchesStatus(makeProduct({ disabled: true }), "all")).toBe(true);
    expect(matchesStatus(makeProduct({ packsInStock: 0 }), "all")).toBe(true);
  });

  it("'active' excludes hidden products", () => {
    expect(matchesStatus(makeProduct({ disabled: false }), "active")).toBe(true);
    expect(matchesStatus(makeProduct({ disabled: true }), "active")).toBe(false);
  });

  it("'hidden' only matches disabled products", () => {
    expect(matchesStatus(makeProduct({ disabled: true }), "hidden")).toBe(true);
    expect(matchesStatus(makeProduct({ disabled: false }), "hidden")).toBe(false);
  });

  it("'low' matches active products with 1-4 packs available", () => {
    expect(matchesStatus(makeProduct({ packsInStock: 1 }), "low")).toBe(true);
    expect(matchesStatus(makeProduct({ packsInStock: 4 }), "low")).toBe(true);
    expect(matchesStatus(makeProduct({ packsInStock: 5 }), "low")).toBe(false);
    expect(matchesStatus(makeProduct({ packsInStock: 0 }), "low")).toBe(false);
  });

  it("'low' excludes hidden products even when stock is low", () => {
    expect(matchesStatus(makeProduct({ packsInStock: 2, disabled: true }), "low")).toBe(false);
  });

  it("'low' respects reserved packs (uses available, not physical)", () => {
    // Physical 10, reserved 8 → available 2, qualifies as low
    expect(matchesStatus(makeProduct({ packsInStock: 10, packsReserved: 8 }), "low")).toBe(true);
  });

  it("'out' matches active products with zero available", () => {
    expect(matchesStatus(makeProduct({ packsInStock: 0 }), "out")).toBe(true);
    expect(matchesStatus(makeProduct({ packsInStock: 5, packsReserved: 5 }), "out")).toBe(true);
    expect(matchesStatus(makeProduct({ packsInStock: 1 }), "out")).toBe(false);
  });

  it("'out' excludes hidden products", () => {
    expect(matchesStatus(makeProduct({ packsInStock: 0, disabled: true }), "out")).toBe(false);
  });
});

describe("matchesSearch", () => {
  it("returns true for empty query", () => {
    expect(matchesSearch(makeProduct(), "")).toBe(true);
    expect(matchesSearch(makeProduct(), "   ")).toBe(true);
  });

  it("matches on name", () => {
    expect(matchesSearch(makeProduct({ name: "Mocha Knit Top" }), "knit")).toBe(true);
  });

  it("matches on sku", () => {
    expect(matchesSearch(makeProduct({ sku: "COL-13276" }), "13276")).toBe(true);
  });

  it("matches on category", () => {
    expect(matchesSearch(makeProduct({ category: "Knitwear" }), "knit")).toBe(true);
  });

  it("matches on colour", () => {
    expect(matchesSearch(makeProduct({ colour: "Forest Green" }), "forest")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesSearch(makeProduct({ name: "Camel Jacket" }), "CAMEL")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(matchesSearch(makeProduct(), "nonexistent")).toBe(false);
  });
});

describe("filterProducts", () => {
  const products: ProductForFilter[] = [
    makeProduct({ name: "A Top", sku: "A1", packsInStock: 10 }),
    makeProduct({ name: "B Top", sku: "B1", packsInStock: 0 }),
    makeProduct({ name: "C Top", sku: "C1", packsInStock: 3 }),
    makeProduct({ name: "D Top", sku: "D1", disabled: true }),
  ];

  it("applies search and filter together (AND)", () => {
    // "Top" matches all on search, but 'low' filter narrows to C only
    const result = filterProducts(products, "Top", "low");
    expect(result.map((p) => p.sku)).toEqual(["C1"]);
  });

  it("returns everything for 'all' + empty search", () => {
    expect(filterProducts(products, "", "all")).toHaveLength(4);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterProducts(products, "Z", "all")).toHaveLength(0);
  });
});

describe("statusCounts", () => {
  it("counts each bucket correctly with mixed inventory", () => {
    const products: ProductForFilter[] = [
      makeProduct({ packsInStock: 10 }), // active, ok
      makeProduct({ packsInStock: 3 }), // active, low
      makeProduct({ packsInStock: 0 }), // active, out
      makeProduct({ disabled: true, packsInStock: 0 }), // hidden (out doesn't count)
      makeProduct({ disabled: true }), // hidden
    ];
    expect(statusCounts(products)).toEqual({
      all: 5,
      active: 3,
      hidden: 2,
      low: 1,
      out: 1,
    });
  });

  it("returns all-zero (except all) for empty list", () => {
    expect(statusCounts([])).toEqual({ all: 0, active: 0, hidden: 0, low: 0, out: 0 });
  });

  it("does not double-count: a product is in exactly one of low/out among active", () => {
    const products: ProductForFilter[] = [makeProduct({ packsInStock: 0 })];
    const counts = statusCounts(products);
    expect(counts.active).toBe(1);
    expect(counts.low + counts.out).toBe(1);
  });
});
