/**
 * Client-safe helper: returns the URL to use for <img src> for a product image value.
 * - Full URL (http/https) or path starting with / → use as-is.
 * - Otherwise (blob key from Image Service) → use our signed proxy (admin or public).
 */
export function imageDisplayUrl(value: string, options?: { forAdmin?: boolean }): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  const base = options?.forAdmin ? "/api/admin/images/signed" : "/api/images/signed";
  return `${base}?key=${encodeURIComponent(v)}`;
}
