import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF protection middleware.
 *
 * Enforces CSRF token validation on all state-changing requests (POST, PATCH, DELETE)
 * to API routes, except for:
 * - Auth endpoints (login, register, OTP, password reset) — user may not have a CSRF token yet
 * - Worldpay webhook — server-to-server, no cookies
 * - Chat endpoint — public, no state change to user data
 *
 * Uses the double-submit cookie pattern: the CSRF token in the cookie must match
 * the X-CSRF-Token header.
 */

const CSRF_COOKIE = "b2b_csrf";
const CSRF_HEADER = "x-csrf-token";

// Endpoints exempt from CSRF (auth flow, webhooks, public endpoints)
const CSRF_EXEMPT = [
  "/api/auth/",
  "/api/webhooks/",
  "/api/chat",
  "/api/health",
];

function isExempt(pathname: string): boolean {
  return CSRF_EXEMPT.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const pathname = nextUrl.pathname;

  // Only check API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Only check state-changing methods
  if (method !== "POST" && method !== "PATCH" && method !== "DELETE") {
    return NextResponse.next();
  }

  // Skip exempt endpoints
  if (isExempt(pathname)) {
    return NextResponse.next();
  }

  // Validate CSRF token
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token. Please refresh the page and try again." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
