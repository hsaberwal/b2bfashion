import { describe, expect, it } from "vitest";
import {
  availableOf,
  matchesStatus,
  matchesSearch,
  filterProducts,
  sortProducts,
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

describe("sortProducts", () => {
  const products: ProductForFilter[] = [
    makeProduct({ name: "Banana", sku: "B1", category: "Top", colour: "Red", pricePerPiece: 12, packsInStock: 5, packSize: 6 }),
    makeProduct({ name: "Apple", sku: "A1", category: "Dress", colour: "Blue", pricePerPiece: 8, packsInStock: 20, packSize: 3 }),
    makeProduct({ name: "Cherry", sku: "C1", category: "Jumper", colour: "Green", pricePerPiece: 20, packsInStock: 0, packSize: 12 }),
  ];

  it("sorts by name ascending and descending", () => {
    expect(sortProducts(products, "name", "asc").map((p) => p.name)).toEqual(["Apple", "Banana", "Cherry"]);
    expect(sortProducts(products, "name", "desc").map((p) => p.name)).toEqual(["Cherry", "Banana", "Apple"]);
  });

  it("sorts by category", () => {
    expect(sortProducts(products, "category", "asc").map((p) => p.category)).toEqual(["Dress", "Jumper", "Top"]);
  });

  it("sorts by price numerically (not lexically)", () => {
    expect(sortProducts(products, "price", "asc").map((p) => p.pricePerPiece)).toEqual([8, 12, 20]);
  });

  it("sorts by available stock", () => {
    expect(sortProducts(products, "stock", "desc").map((p) => p.packsInStock)).toEqual([20, 5, 0]);
  });

  it("does not mutate the input array", () => {
    const before = products.map((p) => p.sku);
    sortProducts(products, "name", "desc");
    expect(products.map((p) => p.sku)).toEqual(before);
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
