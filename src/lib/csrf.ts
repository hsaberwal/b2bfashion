/**
 * CSRF protection for state-changing API routes.
 *
 * Uses the "double-submit cookie" pattern:
 * - A CSRF token is stored in a cookie (httpOnly: false so JS can read it)
 * - Client sends the token in the X-CSRF-Token header
 * - Server verifies they match
 *
 * This works because a cross-origin attacker cannot read the cookie value.
 */

import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const CSRF_COOKIE = "b2b_csrf";
const CSRF_HEADER = "x-csrf-token";

/** Generate and set a CSRF token cookie. Returns the token. */
export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false, // JS needs to read it for the header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
  return token;
}

/** Validate the CSRF token from the request header against the cookie. */
export async function validateCsrf(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  // Timing-safe comparison
  const { timingSafeEqual } = await import("crypto");
  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}
