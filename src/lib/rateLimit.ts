/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach with automatic cleanup.
 */

const windows = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of windows) {
      if (val.resetAt < now) windows.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Check if a request should be rate-limited.
 * @param key - Unique identifier (e.g. IP + endpoint)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 * @returns true if the request should be BLOCKED
 */
export function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || entry.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return true;
  }
  return false;
}

/**
 * Extract client IP from request headers (works behind Railway proxy).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
