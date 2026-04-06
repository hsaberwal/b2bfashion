"use client";

import { useEffect } from "react";

/**
 * Patches the global fetch to automatically include the CSRF token
 * on all POST/PATCH/DELETE requests to our API.
 *
 * The CSRF token is read from the b2b_csrf cookie (set by the session endpoint).
 */
export function CsrfProvider() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async function (input, init) {
      const method = (init?.method ?? "GET").toUpperCase();

      if (method === "POST" || method === "PATCH" || method === "DELETE") {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

        // Only add CSRF header for our own API routes
        if (url.startsWith("/api/") || url.startsWith(window.location.origin + "/api/")) {
          const csrfMatch = document.cookie.match(/(?:^|;\s*)b2b_csrf=([^;]*)/);
          const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";

          if (csrfToken) {
            const headers = new Headers(init?.headers);
            if (!headers.has("X-CSRF-Token")) {
              headers.set("X-CSRF-Token", csrfToken);
            }
            init = { ...init, headers };
          }
        }
      }

      return originalFetch.call(window, input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
