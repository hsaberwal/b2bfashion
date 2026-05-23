/**
 * Client-safe helper: returns the URL to use for <img src> for a product image value.
 * - Full URL (http/https) or path starting with / → use as-is.
 * - Otherwise (blob key from Image Service) → use our signed proxy (admin or public).
 *
 * Pass `width` for blob-key images to have the proxy serve a resized, format-optimised
 * copy (e.g. 600 for grid thumbnails, 1200 for detail) instead of the full original.
 * Ignored for full URLs/paths, which we can't transform.
 */
export function imageDisplayUrl(
  value: string,
  options?: { forAdmin?: boolean; width?: number }
): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  const base = options?.forAdmin ? "/api/admin/images/signed" : "/api/images/signed";
  const params = new URLSearchParams({ key: v });
  if (options?.width && Number.isFinite(options.width) && options.width > 0) {
    params.set("w", String(Math.round(options.width)));
  }
  return `${base}?${params.toString()}`;
}
