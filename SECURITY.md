# Security

Summary of security measures in place. Use this as a checklist for #16 (Strong website security).

## Authentication & sessions

- **Session-based auth**: Cookie (httpOnly recommended in production) with server-side session store (MongoDB). No JWT in localStorage.
- **Password**: Hashed (bcrypt) before storage. OTP and password reset use time-limited tokens.
- **Admin**: Protected routes use `requireAdmin()`; role stored on user.

## Headers (next.config)

- **X-Frame-Options: DENY** — reduces clickjacking.
- **X-Content-Type-Options: nosniff** — prevents MIME sniffing.
- **Referrer-Policy: strict-origin-when-cross-origin** — limits referrer leakage.
- **Permissions-Policy** — restricts camera, microphone, geolocation.

## Input validation

- **Zod** used on API routes for request body (orders, profile, admin user updates, sign payload).
- **ObjectId** validation for MongoDB IDs where applicable.

## Screenshot / copy protection

- **CSS**: `user-select: none`, `-webkit-touch-callout: none`, `-webkit-user-drag: none` on `.screenshot-protected` (pricing areas).
- **JS**: Right-click (context menu) disabled on elements with `.screenshot-protected`.

## HTTPS

- Enforced in production (e.g. Railway). Ensure `NEXTAUTH_URL` / app URL uses `https://`.

## Recommended next steps

- **Rate limiting**: Add rate limiting on login, OTP send, and password reset (e.g. per IP or per email) to reduce brute force.
- **CSRF**: Next.js API routes using same-origin cookies are less exposed; for strict CSRF consider SameSite=Strict and/or CSRF tokens on state-changing actions.
- **Audit**: Periodically review who has admin access and which users have pricing/forward stock.
