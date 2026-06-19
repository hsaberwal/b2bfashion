/**
 * Pure helpers for the admin products list — filtering, search, and
 * stock-derived counts. Extracted so they can be tested without
 * rendering the React component.
 */

export type StatusFilter = "all" | "active" | "hidden" | "low" | "out";

/** Minimum shape required for filtering. */
export type ProductForFilter = {
  name: string;
  sku: string;
  category: string;
  colour: string;
  pricePerPiece?: number;
  packSize?: number;
  packsInStock?: number;
  packsReserved?: number;
  disabled?: boolean;
};

/** Available stock = physical stock minus already-reserved packs (clamped at zero). */
export function availableOf(p: Pick<ProductForFilter, "packsInStock" | "packsReserved">): number {
  return Math.max(0, (p.packsInStock ?? 0) - (p.packsReserved ?? 0));
}

/** Threshold below which we consider a product "low stock" on the admin list. */
export const LOW_STOCK_THRESHOLD = 5;

/** Whether a product matches the given status filter. */
export function matchesStatus(p: ProductForFilter, filter: StatusFilter): boolean {
  const avail = availableOf(p);
  switch (filter) {
    case "all":
      return true;
    case "active":
      return !p.disabled;
    case "hidden":
      return !!p.disabled;
    case "low":
      return !p.disabled && avail > 0 && avail < LOW_STOCK_THRESHOLD;
    case "out":
      return !p.disabled && avail === 0;
  }
}

/** Whether a product matches the given free-text search query (case-insensitive). */
export function matchesSearch(p: ProductForFilter, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${p.name} ${p.sku} ${p.category} ${p.colour}`.toLowerCase().includes(q);
}

/** Apply both the search query and status filter. */
export function filterProducts<T extends ProductForFilter>(
  products: T[],
  search: string,
  filter: StatusFilter,
): T[] {
  return products.filter((p) => matchesSearch(p, search) && matchesStatus(p, filter));
}

/** Fields the admin products list can be sorted by. */
export type SortKey = "name" | "sku" | "category" | "colour" | "price" | "stock" | "packSize";
export type SortDir = "asc" | "desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Category" },
  { key: "colour", label: "Colour" },
  { key: "price", label: "Price" },
  { key: "stock", label: "Stock (available)" },
  { key: "packSize", label: "Pack size" },
];

function sortValue(p: ProductForFilter, key: SortKey): string | number {
  switch (key) {
    case "name": return p.name?.toLowerCase() ?? "";
    case "sku": return p.sku?.toLowerCase() ?? "";
    case "category": return p.category?.toLowerCase() ?? "";
    case "colour": return p.colour?.toLowerCase() ?? "";
    case "price": return p.pricePerPiece ?? -1;
    case "stock": return availableOf(p);
    case "packSize": return p.packSize ?? 0;
  }
}

/** Stable sort by the given key + direction. Returns a new array. */
export function sortProducts<T extends ProductForFilter>(products: T[], key: SortKey, dir: SortDir): T[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    // Tie-break on SKU for a deterministic order.
    return a.sku.localeCompare(b.sku) * factor;
  });
}

/** Counts of products in each status bucket — used to render filter pill badges. */
export type StatusCounts = {
  all: number;
  active: number;
  hidden: number;
  low: number;
  out: number;
};

export function statusCounts(products: ProductForFilter[]): StatusCounts {
  const counts: StatusCounts = { all: products.length, active: 0, hidden: 0, low: 0, out: 0 };
  for (const p of products) {
    if (p.disabled) {
      counts.hidden++;
      continue;
    }
    counts.active++;
    const avail = availableOf(p);
    if (avail === 0) counts.out++;
    else if (avail < LOW_STOCK_THRESHOLD) counts.low++;
  }
  return counts;
}
