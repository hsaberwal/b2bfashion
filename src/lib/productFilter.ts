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
