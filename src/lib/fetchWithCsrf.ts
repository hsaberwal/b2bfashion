/**
 * Fetch wrapper that automatically includes the CSRF token
 * from the b2b_csrf cookie in the X-CSRF-Token header.
 *
 * Use this for all POST/PATCH/DELETE requests to API routes.
 */

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)b2b_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? "GET").toUpperCase();

  // Add CSRF token for state-changing requests
  if (method === "POST" || method === "PATCH" || method === "DELETE") {
    headers.set("X-CSRF-Token", getCsrfToken());
  }

  return fetch(url, { ...options, headers });
}
