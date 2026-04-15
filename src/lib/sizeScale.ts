/**
 * Parser for the "Size Scale" column from the Claudia.C stock sheet.
 *
 * The format combines sizes and ratio in one string:
 *   "10-18 (1-2-2-2-1)" → UK-10, UK-12, UK-14, UK-16, UK-18 with ratio 1,2,2,2,1
 *   "12-20 (1-2-2-2-1)" → UK-12, UK-14, UK-16, UK-18, UK-20 with ratio 1,2,2,2,1
 *   "S-XL (1-2-2-1)"    → S, M, L, XL with ratio 1,2,2,1
 *
 * Returns null if the format cannot be parsed.
 */

export type ParsedSizeScale = {
  sizes: string[];
  ratio: number[];
  packSize: number;
};

const LETTER_SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

function expandLetterRange(from: string, to: string): string[] | null {
  const fromIdx = LETTER_SIZE_ORDER.indexOf(from.toUpperCase());
  const toIdx = LETTER_SIZE_ORDER.indexOf(to.toUpperCase());
  if (fromIdx === -1 || toIdx === -1 || toIdx < fromIdx) return null;
  return LETTER_SIZE_ORDER.slice(fromIdx, toIdx + 1);
}

function expandNumericRange(from: number, to: number): string[] {
  // UK ladies' sizing is always in steps of 2 (10, 12, 14, 16, ...)
  const result: string[] = [];
  for (let n = from; n <= to; n += 2) {
    result.push(`UK-${n}`);
  }
  return result;
}

/**
 * Parse a size scale string like "10-18 (1-2-2-2-1)" or "S-XL (1-2-2-1)".
 */
export function parseSizeScale(input: string): ParsedSizeScale | null {
  if (!input || typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\s+/g, " ");

  // Split into "range" and "(ratio)"
  const match = cleaned.match(/^(.+?)\s*\(\s*([\d-]+)\s*\)\s*$/);
  if (!match) return null;

  const rangePart = match[1].trim();
  const ratioPart = match[2].trim();

  // Parse ratio: "1-2-2-2-1" → [1, 2, 2, 2, 1]
  const ratio = ratioPart.split("-").map((n) => parseInt(n.trim(), 10));
  if (ratio.some((n) => isNaN(n) || n < 0)) return null;

  // Parse range: either numeric "10-18" or letter "S-XL"
  const rangeMatch = rangePart.match(/^(\S+)\s*-\s*(\S+)$/);
  if (!rangeMatch) return null;

  const from = rangeMatch[1];
  const to = rangeMatch[2];

  let sizes: string[] | null = null;

  // Try numeric first
  const fromNum = parseInt(from, 10);
  const toNum = parseInt(to, 10);
  if (!isNaN(fromNum) && !isNaN(toNum) && fromNum <= toNum) {
    sizes = expandNumericRange(fromNum, toNum);
  } else {
    // Try letter range
    sizes = expandLetterRange(from, to);
  }

  if (!sizes) return null;

  // The number of ratio values must match the number of sizes
  if (sizes.length !== ratio.length) return null;

  const packSize = ratio.reduce((sum, n) => sum + n, 0);
  return { sizes, ratio, packSize };
}

/**
 * Format parsed data back into a stock-sheet-style string for display.
 */
export function formatSizeScale(parsed: ParsedSizeScale): string {
  return `${parsed.sizes.join(", ")} (${parsed.ratio.join("-")}) = pack of ${parsed.packSize}`;
}
