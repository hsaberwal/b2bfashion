# Claudia.C B2B — Architecture Reference

The canonical technical reference for this codebase. Read this first if you need to understand, extend, or rebuild the system.

If you're reading this to **rebuild from scratch**, work through it top-down: stack → data models → API surface → lifecycles → integrations → security → testing.

---

## 1. Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | RSC + Server Actions disabled; everything is route handlers + `"use client"` pages |
| Runtime | Node.js 20 | Pinned by `nixpacks.toml` |
| Language | TypeScript (strict) | `tsc --noEmit` runs on every build |
| Styling | Tailwind CSS 3 | Custom palette (`je-cream`, `je-black`, `je-muted`, `je-charcoal`, `je-offwhite`, `je-border`, `je-white`) |
| Validation | Zod | All API bodies/query params |
| DB | MongoDB | Mongoose ODM; `connectDB()` lazy-singleton in `src/lib/mongodb.ts` |
| Auth | Custom session cookies | bcrypt password, crypto-random session token; stored in `sessions` collection |
| CSRF | Double-submit cookie | Enforced by `src/middleware.ts` on POST/PATCH/DELETE |
| Email | Resend | Verification, OTP, password reset, new-order admin + customer order emails (PDF attached) |
| Payments | Stripe Checkout (hosted) | Customer pre-created with `address.country: "GB"`; webhook is authoritative |
| AI chat | Anthropic Claude (Sonnet) | Chatbot widget |
| AI vision | Anthropic Claude (Sonnet) | Label scanner extracts materials/care/sizes from photos |
| AI imaging | FASHN | Model photo generation |
| Image storage | Railway Image Service (primary), Cloudinary (fallback), Volume mount (fallback) | Served via signed-URL proxy `/api/images/signed` |
| Hosting | Railway | Nixpacks build; `npm install --no-audit --no-fund` then `npm run build`; runtime `npm run start` |
| PWA | Custom service worker | `public/sw.js` — network-first HTML, stale-while-revalidate static, network-only API |
| Testing | Vitest | Coverage v8; `src/lib/**` + `src/app/api/**` included; UI excluded |

---

## 2. Repo structure

```
src/
  middleware.ts                       # CSRF enforcement on state-changing methods
  app/
    layout.tsx                        # Root layout: fonts, JSON-LD, SiteChrome, CookieConsent
    page.tsx                          # Homepage (hero + featured + latest looks)
    globals.css                       # Tailwind base + .screenshot-protected rules
    sitemap.ts / robots.ts            # SEO surfaces
    api/
      auth/                           # login, logout, register, session, verify-email,
                                      # otp/{send,verify}, password-reset/{request,perform}
      orders/
        route.ts                      # GET (customer's orders + cart), POST (add to cart)
        [id]/
          route.ts                    # PATCH (update cart items)
          sign/route.ts               # POST (sign order, reserve stock, fire admin email)
          pay/route.ts                # POST (create Stripe Checkout Session)
          payment-status/route.ts     # GET (used by /checkout/result page)
      webhooks/stripe/route.ts        # Authoritative Stripe webhook receiver
      products/
        route.ts / [id]/route.ts      # Public catalogue
        featured / hero / latest-looks# Curated homepage feeds
      site-content/route.ts           # Read editable About / Footer content
      user/profile/route.ts           # Get / update logged-in user profile
      newsletter/route.ts             # POST email to NewsletterSubscriber
      images/signed/route.ts          # Public signed image proxy
      uploads/[filename]/route.ts     # Volume-mount fallback image serving
      chat/route.ts                   # Claude chatbot
      admin/
        stats/route.ts                # Admin dashboard summary
        orders/
          route.ts                    # GET list with filters
          [id]/
            route.ts                  # GET full order with payments & customer
            status/route.ts           # POST advance fulfilment status
            payments/route.ts         # POST record manual payment
            pdf/route.ts              # GET sales order / pick sheet PDF
        users/
          route.ts                    # GET list of all customers
          [id]/route.ts               # GET full customer with orders, PATCH perms, DELETE
          bulk-enable-forward/        # Toggle forward-stock access for many users
        products/
          route.ts / [id]/route.ts    # CRUD
          bulk-import/route.ts        # XLSX import with size scale parser
        site-content/route.ts         # Write About + Footer content
        images/signed/route.ts        # Admin image proxy (always returns signed URL)
        scan-label/route.ts           # Claude vision label OCR
        generate-model-photos/        # FASHN AI generation
        upload/route.ts               # Image upload (magic-bytes verified)
        seed/route.ts                 # Dev-only seed
        cleanup-unverified/route.ts   # Background sweep
        claim/route.ts                # One-time admin claim via CLAIM_ADMIN_SECRET
    about/                            # Editable About page
    account/                          # Profile management
    admin/                            # Admin shell + pages
      layout.tsx                      # Wraps in AdminShell
      page.tsx                        # Dashboard home (banners + stat cards)
      orders/
        page.tsx                      # List with filters
        [id]/page.tsx                 # Detail + print pick list + PDF sales order + status controls + payments
      users/
        page.tsx                      # List
        [id]/page.tsx                 # Customer detail with order history + outstanding
      products/                       # CRUD + bulk import UI
      pages/                          # Site-content editor
    apply/                            # Wholesale application form
    cart/
      page.tsx                        # Cart + past orders (with fulfilment progress)
      [id]/sign/page.tsx              # Checkout: address, signature, payment option
    checkout/result/page.tsx          # Post-Stripe redirect landing
    products/
      page.tsx                        # Shop All listing (was "Garments")
      [id]/page.tsx                   # Product detail
    login/ register/ forgot-password/ reset-password/   # Auth pages
    claim-admin/                      # Self-elevate via CLAIM_ADMIN_SECRET
    privacy/ terms/ returns/ shipping/                  # Legal pages
  components/
    SiteChrome.tsx                    # Wraps non-admin routes with Navbar + Footer
    Navbar.tsx                        # Sticky nav, live cart badge
    Footer.tsx                        # Editable footer + trust badges + newsletter
    CookieConsent.tsx                 # PECR-compliant banner, persisted in localStorage
    NewsletterSignup.tsx              # Footer email form
    TrustBadges.tsx                   # Stripe / SSL / UK / GDPR row
    Chatbot.tsx                       # Floating Claude widget
    HeroSection.tsx                   # Auto-cycling hero
    FeaturedProducts.tsx              # Homepage curated grid
    LatestLooks.tsx                   # Homepage rotating gallery
    HomepageGallery.tsx               # Standalone gallery
    InstallPrompt.tsx                 # Mobile PWA install nudge
    Breadcrumbs.tsx                   # BreadcrumbList JSON-LD + visible trail
    OrganizationJsonLd.tsx            # Site-wide Organization schema
    ProductJsonLd.tsx                 # Per-product Product schema
    LegalPage.tsx                     # Shared legal-page layout
    PwaRegister.tsx                   # Registers service worker
    ScreenshotProtection.tsx          # Disables right-click on .screenshot-protected
    CsrfProvider.tsx                  # Auto-injects CSRF header into fetch
    admin/
      AdminShell.tsx                  # Admin layout with nav + View store button
      ProductForm.tsx                 # Shared add/edit product UI
  lib/
    mongodb.ts                        # Lazy MongoClient singleton
    auth.ts                           # hashPassword, verifyPassword, getSessionToken, etc.
    requireAdmin.ts                   # Throws { status: 401|403 } for non-admins
    csrf.ts                           # Token issue + verify
    encrypt.ts                        # AES-256-GCM for signature data
    rateLimit.ts                      # In-memory window limiter + getClientIp
    audit.ts                          # Writes AuditLog rows for security events
    pricing.ts                        # calculateOrderTotal, calculateDeposit,
                                      # calculatePackPrice, sumPayments,
                                      # calculateOutstanding
    orderStatus.ts                    # OrderStatus type, FULFILMENT_STEPS,
                                      # STATUS_LABEL, nextStatus, isAfter, isAtOrAfter
    stripe.ts                         # createCheckoutSession (with customer reuse),
                                      # constructWebhookEvent, retrieveSession
    adminNotifications.ts             # sendNewOrderEmail + sendCustomerOrderEmail (Resend)
    buildOrderPdf.ts                  # load order + render PDF (shared by route + emails)
    orderPdf.ts                       # generateOrderPdf — CLAUDIA.C sales order (one
                                      # row per SKU) + per-size picking page + signature
    fashn.ts                          # FASHN client
    signupHygiene.ts                  # Disposable email + MX checks
    sizeScale.ts                      # "10-18 (1-2-2-2-1)" parser
    productFilter.ts                  # Used by /api/products
    guestCart.ts                      # localStorage cart + dispatchCartUpdated event
    imageDisplayUrl.ts                # Resolves blob key → display URL; optional
                                      # width → proxy serves a resized copy
    imageService.ts                   # Railway Image Service client
    fetchWithCsrf.ts                  # Convenience wrapper
    richText.tsx                      # Minimal Markdown renderer
    types.ts                          # PRODUCT_CATEGORIES const + shared types
  models/
    User.ts                           # Customers + admins
    Session.ts                        # Auth session tokens
    Product.ts                        # Catalogue
    Order.ts                          # Orders (with fulfilment lifecycle)
    Payment.ts                        # Payment ledger (Stripe + manual)
    NewsletterSubscriber.ts           # Footer signups
    SiteContent.ts                    # Editable About / Footer content
    AuditLog.ts                       # Security audit trail
public/
  sw.js                               # Service worker
  manifest.webmanifest                # PWA manifest
  icons/ images/                      # App icons + static assets
```

---

## 3. Data models

### 3.1 User (`src/models/User.ts`)

| Field | Type | Notes |
|---|---|---|
| `email` | string (unique, lowercase) | Required |
| `passwordHash` | string | bcrypt cost 12 |
| `name` | string | Optional |
| `companyName` | string | Optional |
| `deliveryAddress` | sub-doc | `addressLine1`, `addressLine2`, `city`, `postcode`, `country` |
| `vatNumber` | string | Optional |
| `applicationMessage` | string | From wholesale application form |
| `role` | enum | `"customer"` \| `"admin"` |
| `pricingApproved` | bool | Default `false`. Customer sees prices only when true (admins always see) |
| `canViewForwardStock` | bool | Default `false` |
| `canViewCurrentStock` | bool | Default `true` |
| `canViewPreviousStock` | bool | Default `true` |
| `emailVerified` | bool | Default `false`; expires + auto-deletes after 24h if not verified |
| `verificationToken` | string | nanoid; cleared on verify |
| `otpCode` / `otpExpires` | string / Date | Time-limited login OTP |
| `resetToken` / `resetTokenExpires` | string / Date | Password reset |
| `stripeCustomerId` | string (indexed) | Set on first checkout; reused on subsequent orders |
| `createdAt` / `updatedAt` | Date | Auto |

### 3.2 Session (`src/models/Session.ts`)

| Field | Notes |
|---|---|
| `token` | Crypto-random; stored in httpOnly cookie `session` |
| `userId` | Ref → User |
| `expiresAt` | Date; queries always filter `{ expiresAt: { $gt: now } }` |

### 3.3 Product (`src/models/Product.ts`)

| Field | Type | Notes |
|---|---|---|
| `sku` | string (unique) | `{SPC}-{COLOUR}` (e.g. `COL13276-BLACK`) |
| `brandCode` / `brand` / `season` | string | From bulk import |
| `name` / `description` / `longDescription` | string | |
| `materials` / `careGuide` | string | Care guide often filled via label scanner |
| `category` | enum | One of `PRODUCT_CATEGORIES`: `Blouse`, `Cardigan`, `Dress`, `Gilet`, `Jumper`, `Shrug`, `Skirt`, `T-shirt`, `Top`, `Trouser`, `Tunic` |
| `stockCategory` | enum | `"previous"` \| `"current"` \| `"forward"` |
| `colour` | string | Primary colour |
| `sizes` | string[] | e.g. `["UK-10", "UK-12", ...]` |
| `sizeRatio` | number[] | Same length as `sizes`, e.g. `[1, 2, 2, 2, 1]` |
| `packSize` | number | Sum of `sizeRatio` |
| `minPacks` | number | Default 1 |
| `pricePerPiece` | number | Per-piece wholesale price (GBP) |
| `packsInStock` | number | Physical inventory |
| `packsReserved` | number | Held by signed orders awaiting fulfilment |
| `attributes` | Mixed | Free-form |
| `images` | string[] | Blob keys; resolved via `imageDisplayUrl` |
| `heroFocalPoint` | string | CSS `object-position` |
| `heroImageIndex` | number | Which image to use on Front Page |
| `heroExcludedIndexes` | number[] | Images excluded from hero cycling |
| `featured` / `showOnHero` / `latestLooks` | bool | Homepage curation flags |
| `disabled` | bool | Hides from public; admin still sees |

Indexes: `stockCategory`, `category`, `colour`, `season`, `disabled`.

### 3.4 Order (`src/models/Order.ts`)

| Field | Type | Notes |
|---|---|---|
| `userId` | ref User | |
| `items[]` | sub-doc array | `productId`, `sku`, `quantity`, `pricePerPiece`, `packSize`, `size?` |
| `status` | enum | `pending` \| `signed` \| `confirmed` \| `picked` \| `ready_to_ship` \| `shipped` \| `delivered` \| `cancelled` |
| `signatureDataUrl` | string | AES-256-GCM encrypted |
| `signedAt` | Date | |
| `specialInstructions` | string | Free-text notes from the customer at checkout; printed on the sales-sheet PDF + pick list |
| `deliverySnapshot` | sub-doc | Captured at sign time so a later address change doesn't rewrite history |
| `paymentOption` | enum | `pay_now` \| `pay_deposit` \| `pay_later` |
| `depositAmount` | number | Server-calculated as 10% of total |
| `depositPaid` | bool | |
| `paymentStatus` | enum | `none` \| `pending` \| `paid` \| `failed` \| `refunded` |
| `amountPaid` | number | Recomputed from `Payment` rows after each payment event |
| `stripeSessionId` / `stripePaymentIntentId` | string | For webhook reconciliation |
| `pickedAt` / `readyAt` / `shippedAt` / `deliveredAt` | Date | Stamped on each transition |
| `shippingCarrier` / `shippingTrackingNumber` | string | Optional, captured at "Mark shipped" |
| `createdAt` / `updatedAt` | Date | Auto |

Indexes: `userId`, `status`.

### 3.5 Payment (`src/models/Payment.ts`)

The source of truth for "how much has been paid against this order."

| Field | Type | Notes |
|---|---|---|
| `orderId` | ref Order (indexed) | |
| `userId` | ref User (indexed) | |
| `amount` | number | GBP |
| `currency` | string | Default `"GBP"` |
| `method` | enum | `stripe` \| `cash` \| `bank_transfer` \| `cheque` \| `other` |
| `reference` | string | Stripe session id, bank ref, cheque number, etc. |
| `note` | string | Free-form note from admin |
| `stripePaymentIntentId` | string | Set on Stripe webhook captures; used for refund matching |
| `refunded` | bool | Default `false` |
| `recordedBy` | ref User | Admin who recorded a manual payment |
| `createdAt` / `updatedAt` | Date | Auto |

**Idempotency:** Stripe webhook `upserts` on `{ stripePaymentIntentId }` so retries don't double-count.

### 3.6 NewsletterSubscriber (`src/models/NewsletterSubscriber.ts`)

| Field | Notes |
|---|---|
| `email` | unique, lowercase, indexed |
| `source` | Default `"footer"` |
| `ipAddress` | Captured for abuse review |
| `unsubscribed` | Default `false` (manual flag — no public unsubscribe flow yet) |

### 3.7 SiteContent (`src/models/SiteContent.ts`)

Keyed editable content blocks. Written via admin, read by public site-content endpoints. Keys in use:

- `"about"`, `"footer"` — editable CMS page/footer content
- `"orderNotifications"` — admin new-order email recipient list
- `"comingSoon"` — `{ enabled, message }` for the logged-out "coming soon" banner
- `"heroBanners"` — `{ mode: "products"|"banners"|"mixed", banners: [{ image, link?, headline?, subtext? }] }` for admin-uploaded homepage hero banners (managed at `/admin/banners`, sanitised on read by `src/lib/heroBanners.ts`)

### 3.8 AuditLog (`src/models/AuditLog.ts`)

Security audit trail. `AuditAction` union in `src/lib/audit.ts`:

```
login_success, login_failed, logout, register,
otp_sent, otp_verified, otp_failed,
password_reset_requested, password_reset_completed,
role_changed, user_approved, user_updated,
product_created, product_updated, product_deleted,
order_signed, order_status_changed,
payment_initiated, payment_completed, payment_recorded, payment_failed,
admin_action
```

---

## 4. API surface

Every state-changing endpoint requires the CSRF token issued via `GET /api/auth/session` (handled automatically by `CsrfProvider` for in-app fetches).

### 4.1 Auth (`/api/auth/*`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Email + password; sends verification email; returns 200 regardless to prevent enumeration |
| POST | `/api/auth/login` | Email + password OR OTP; rate-limited 10/15min |
| POST | `/api/auth/logout` | Invalidates session |
| GET  | `/api/auth/session` | Returns `{ user, csrfToken }` |
| GET  | `/api/auth/verify-email?token=…` | Marks user verified, redirects to `/login?verified=1` |
| POST | `/api/auth/otp/send` | OTP via email |
| POST | `/api/auth/otp/verify` | Trades OTP for session |
| POST | `/api/auth/password-reset/request` | Sends reset link |
| POST | `/api/auth/password-reset/perform` | Sets new password + invalidates all sessions |

### 4.2 Orders (customer)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/orders` | Pending cart + past orders for the logged-in user |
| POST | `/api/orders` | Add line items to the user's single pending cart |
| PATCH | `/api/orders/[id]` | Update cart items (only when `status === "pending"`) |
| POST | `/api/orders/[id]/sign` | Atomic stock reserve, store signature, email the sales-order PDF to admins + the customer |
| POST | `/api/orders/[id]/pay` | Create Stripe Checkout Session OR confirm `pay_later` |
| GET | `/api/orders/[id]/payment-status` | Sync-check Stripe Session on the `/checkout/result` page |

### 4.3 Webhooks

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/stripe` | Signature-verified; handles `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded` |

### 4.4 Products (public)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products?stockCategory=…&category=…&colour=…&search=…` | Catalogue, max 500 |
| GET | `/api/products/[id]` | Single product |
| GET | `/api/products/featured` | Homepage curated |
| GET | `/api/products/hero` | Hero-flagged products **+** the hero banner config (`{ products, hero: { mode, banners } }`) |
| GET | `/api/products/latest-looks` | Latest Looks rotation |

### 4.5 User profile + site content

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/user/profile` | Logged-in user details |
| PATCH | `/api/user/profile` | Update name, company, VAT, delivery address |
| GET | `/api/site-content?key=footer\|about` | Read editable block |
| POST | `/api/newsletter` | Email signup; rate-limited 5/min per IP |
| GET | `/api/chat` (server-sent) | Claude chatbot |
| GET | `/api/images/signed?key=…&w=…` | Public image proxy; optional `w` resizes + re-encodes (WebP/AVIF) via the Image Service `serve/{w}x/` endpoint, falling back to the original |

### 4.6 Admin

All require `requireAdmin()` (throws 401 / 403).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard summary including `orders.{newToday, outstandingOrders, outstandingTotal}` |
| GET | `/api/admin/orders?status=…&paymentStatus=…&paymentOption=…&from=…&to=…&q=…&includeCart=true` | List |
| GET | `/api/admin/orders/[id]` | Full order: customer + payments + rich items |
| POST | `/api/admin/orders/[id]/status` | `{ status, shippingCarrier?, shippingTrackingNumber? }` |
| POST | `/api/admin/orders/[id]/payments` | `{ amount, method, reference?, note? }` |
| GET | `/api/admin/orders/[id]/pdf` | Sales-order PDF — one row per SKU, plus a per-size picking-list page; the customer's signature is drawn on the signature line |
| GET | `/api/admin/users` | All users |
| GET | `/api/admin/users/[id]` | Customer profile + order history + lifetime spend + outstanding |
| PATCH | `/api/admin/users/[id]` | Toggle permissions / role / emailVerified |
| DELETE | `/api/admin/users/[id]` | Remove user + sessions + pending cart |
| POST | `/api/admin/users/bulk-enable-forward` | Mass-toggle forward stock access |
| CRUD | `/api/admin/products[/(id)]` | Catalogue management |
| POST | `/api/admin/products/bulk-import` (multipart .xlsx) | Bulk import |
| POST | `/api/admin/upload` | Image upload (magic-bytes verified) |
| POST | `/api/admin/scan-label` | Claude vision OCR |
| POST | `/api/admin/generate-model-photos` | FASHN AI |
| GET | `/api/admin/images/signed?key=…` | Always-fresh signed URL |
| GET / POST | `/api/admin/site-content` | Read/write About + Footer blocks |
| POST | `/api/admin/claim` | One-time self-elevation via `CLAIM_ADMIN_SECRET` |
| POST | `/api/admin/seed` | Dev-only seed |
| POST | `/api/admin/cleanup-unverified` | Sweep expired unverified accounts |

---

## 5. Order lifecycle (state machine)

```
                       ┌──────────────────────────────┐
                       │                              │
   add to cart         │                              │
  ──────────────► pending                             │
                       │  POST /api/orders/[id]/sign  │
                       │  + delivery snapshot         │
                       │  + signature                 │
                       │  + atomic stock reserve      │
                       │  + email admins (Resend)     │
                       ▼                              │
                    signed ─────────────────► cancelled (admin)
                       │
                       │ POST /api/orders/[id]/pay
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   pay_later        pay_now      pay_deposit
        │              │              │
        │  (Stripe Checkout for pay_now / pay_deposit)
        │              │              │
        │              ▼              ▼
        │         (Stripe webhook: checkout.session.completed)
        │              │              │
        │              │              │  paymentStatus=paid
        │              ▼              ▼  Payment row upserted
        └────────► confirmed
                       │   POST /api/admin/orders/[id]/status
                       ▼
                    picked  (pickedAt stamped)
                       │
                       ▼
                ready_to_ship  (readyAt stamped)
                       │
                       ▼
                    shipped  (shippedAt + carrier + tracking)
                       │
                       ▼
                   delivered  (deliveredAt stamped) — terminal
```

**Helpers:** `src/lib/orderStatus.ts` exposes `FULFILMENT_STEPS`, `nextStatus`, `isAfter`, `isAtOrAfter`, `STATUS_LABEL`, `STATUS_SHORT_LABEL`.

**Customer view:** `/cart` past-orders panel renders `FulfilmentProgress` (a step indicator) on every expanded order.

**Admin view:** `/admin/orders/[id]` shows "Mark as {next status}" buttons in the Fulfilment card. Shipped step prompts for carrier + tracking inline.

---

## 6. Payment lifecycle

Paid amount on an order is always **`sum(Payment.amount where not refunded)`**, computed via `sumPayments` in `src/lib/pricing.ts`. Outstanding = `total − paid` (clamped at zero).

### Flow

1. Customer signs order → `paymentStatus: "none"`, no Payment rows.
2. Customer chooses `pay_now` / `pay_deposit` → `POST /api/orders/[id]/pay` creates a Stripe Checkout Session, sets `paymentStatus: "pending"`. Customer redirected to Stripe.
3. On success, Stripe sends `checkout.session.completed` webhook → `Payment.updateOne({ stripePaymentIntentId }, { $setOnInsert: { method: "stripe", amount: amount_total/100, … } }, { upsert: true })`. Order flips to `paymentStatus: "paid"`, `status: "confirmed"`, `depositPaid` for deposit orders.
4. Stock is consumed: `packsInStock` and `packsReserved` both decremented by the line's pack count.
5. For `pay_later`: order immediately set to `confirmed` + stock consumed (no Stripe involvement). `paymentStatus` stays `none`.
6. Admin records additional payments via `POST /api/admin/orders/[id]/payments` (cash, bank transfer, cheque, manual Stripe). Outstanding recomputes; reaching zero auto-flips `paymentStatus: "paid"`.

### Stripe customer reuse

`createCheckoutSession` in `src/lib/stripe.ts`:

1. If `user.stripeCustomerId` exists, `stripe.customers.retrieve()` it — reuse if still valid (not deleted).
2. Otherwise create a fresh customer with `address.country: "GB"` (default; overridable via `defaultCountry`).
3. Pass `customer: id` plus `customer_update: { address: "auto", name: "auto" }` so Stripe overwrites with whatever the shopper enters.
4. Return `{ id, url, stripeCustomerId }`. The pay route persists `stripeCustomerId` back onto the user.

`locale: "en-GB"` and `billing_address_collection: "required"` are always set so the checkout UI is in British English and the country dropdown defaults to United Kingdom.

### Webhook events handled

| Event | Action |
|---|---|
| `checkout.session.completed` | Upsert Payment row; mark order paid+confirmed; consume stock |
| `checkout.session.expired` | If still pending: release reservation, set `paymentStatus: "none"` |
| `checkout.session.async_payment_failed` | If still pending: release reservation, set `paymentStatus: "failed"` |
| `charge.refunded` | Look up order by `stripePaymentIntentId`, set `paymentStatus: "refunded"` |

---

## 7. Stock reservation

In `src/app/api/orders/[id]/sign/route.ts`:

```js
db.products.updateOne(
  { _id, $expr: { $gte: [ { $subtract: ["$packsInStock", "$packsReserved"] }, packsToReserve ] } },
  { $inc: { packsReserved: packsToReserve } }
)
```

If `matchedCount === 0` → all previously reserved lines on this order roll back and the sign request fails with 409.

On `checkout.session.completed` (or `pay_later` confirmation), both `packsInStock` and `packsReserved` decrement by the line's pack count.

On `checkout.session.expired` / `async_payment_failed` (while still pending), `packsReserved` decrements only.

---

## 8. Auth & CSRF

- Sessions: `Session` model, 30-day expiry, cookie `session` (httpOnly, secure in prod).
- Auth helpers: `src/lib/auth.ts` (`hashPassword`, `verifyPassword`, `getSessionToken`).
- `requireAdmin()` in `src/lib/requireAdmin.ts` returns `SessionUser` or throws `{ status: 401|403 }`.
- CSRF: `src/middleware.ts` enforces double-submit cookie on POST/PATCH/DELETE for `/api/*` (skipping `/api/auth/session`, `/api/webhooks/*`, `/api/auth/verify-email`).
- `CsrfProvider` (client) reads the CSRF cookie issued by `/api/auth/session` and adds `x-csrf-token` header to every fetch.

---

## 9. Email integration (Resend)

Lazy-init `new Resend(process.env.EMAIL_API_KEY)` — skipped entirely if either `EMAIL_API_KEY` or `EMAIL_FROM` is missing (logs a warning in dev).

| Email | Sender |
|---|---|
| Verification link (24h expiry) | `src/app/api/auth/register/route.ts` |
| OTP code | `src/app/api/auth/otp/send/route.ts` |
| Password reset link (1h expiry) | `src/app/api/auth/password-reset/request/route.ts` |
| New-order admin notification (with PDF attached) | `src/lib/adminNotifications.ts` → `sendNewOrderEmail` (called from sign route, fire-and-forget) |
| Customer order confirmation (with PDF attached) | `src/lib/adminNotifications.ts` → `sendCustomerOrderEmail` (called from sign route, fire-and-forget) |

On sign, the route renders the sales-order PDF once (`buildOrderPdf`) and attaches it to both the admin alert and the customer's confirmation. Admin recipients come from the DB-managed list (Admin → Settings), then `ADMIN_NOTIFICATION_EMAILS` (comma-separated), then every `User` with `role: "admin"`.

---

## 10. Image storage

Three backends in priority order:

1. **Railway Image Service** — `IMAGE_SERVICE_URL` + `IMAGE_SERVICE_SECRET_KEY` (uploads) + optional `IMAGE_SERVICE_SIGNATURE_SECRET_KEY` (local signed URLs).
2. **Volume mount** — `UPLOAD_VOLUME_PATH` (e.g. `/data`) served via `/api/uploads/[filename]`.
3. **Cloudinary** — `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`.

Public pages always go through `/api/images/signed?key=…` so the storage URL never reaches the browser. `imageDisplayUrl()` picks the right backend.

For performance, public pages pass a `width` to `imageDisplayUrl()` (e.g. 600 for grids, 1200 for detail, 1600 for the hero). The proxy then requests the Image Service `serve/{w}x/blob/{key}` endpoint, which resizes and re-encodes (WebP/AVIF) on the fly instead of piping the full-resolution original; it falls back to the raw blob if `serve/` resizing is unavailable, and caches resized responses hard (blob keys are content-addressed, so a key+width is immutable). Public `<img>`s also use `loading="lazy"`. Admin thumbnails deliberately stay on the raw blob (the admin proxy redirects rather than streams).

Upload validation: magic-bytes check for JPEG / PNG / WebP / GIF in `src/app/api/admin/upload/route.ts`.

---

## 11. Service worker (PWA)

`public/sw.js`:

- `install` → `skipWaiting()`
- `activate` → clears stale caches + `clients.claim()`
- `fetch`:
  - Cross-origin: passthrough
  - Non-GET: passthrough
  - `/api/*`: network-only
  - `request.destination === "document"`: network-first with cache fallback
  - Everything else (scripts, styles, images): stale-while-revalidate

`PwaRegister` component registers it on mount.

---

## 12. Security

- bcrypt cost 12 (`src/lib/auth.ts`).
- `crypto.randomInt()` OTP, `crypto.timingSafeEqual` comparison.
- AES-256-GCM encrypts `Order.signatureDataUrl` at rest (`ENCRYPTION_KEY` is 64-char hex).
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all set in `next.config.ts`.
- Magic-bytes file upload check.
- Path-traversal regex on image keys.
- Rate limits (in-memory, per-IP):
  - login 10/15min, register 5/hr, OTP send 5/15min, OTP verify 10/15min
  - password-reset request 5/hr, perform 10/15min
  - claim-admin 5/hr, chat 20/5min, payment-status 60/min, newsletter 5/min
- "No enumeration" — auth endpoints respond identically for existing / non-existing accounts.
- Audit log written for every security-relevant event.
- Screenshot protection class `.screenshot-protected` (CSS no-select + JS context-menu block) on pricing surfaces.
- Stripe webhook signature verified via `STRIPE_WEBHOOK_SECRET`; failed verification returns 400 and does **not** trust the body.

---

## 13. Testing

- Vitest + v8 coverage. Config in `vitest.config.ts`. Coverage scoped to `src/lib/**` + `src/app/api/**` (UI excluded by design).
- Run: `npm test` (one shot), `npm run test:watch`, `npm run test:coverage`.
- 125+ tests; new code paths (Payment + admin orders + Stripe customer reuse + webhook + adminNotifications + pricing + orderStatus) all covered to 84–100%.
- Mocking conventions live in [memory/test_mocking_patterns.md](#) — `vi.hoisted` + `vi.mock("@/lib/x")` + chainable Mongoose query stubs + valid 24-char hex IDs for `mockRequireAdmin` (some routes call `new mongoose.Types.ObjectId(admin.id)` which throws on garbage strings).

---

## 14. Build & deploy

- Local dev: `npm install && npm run dev`. Requires local Mongo (e.g. `docker run -p 27017:27017 mongo`).
- Production build: `next build`. Type-checked + linted; failure breaks deploy.
- Railway uses `nixpacks.toml`:
  - setup: `nodejs_20`
  - install: `npm install --no-audit --no-fund` (not `npm ci` — see [DEPLOY.md](DEPLOY.md) "Lockfile drift")
  - build: `npm run build`
  - start: `npm run start`

---

## 15. Environment variables

| Var | Required | Purpose |
|---|---|---|
| `MONGO_URL` / `MONGO_PUBLIC_URL` / `MONGODB_URI` | Yes (one of) | Mongo connection string |
| `JWT_SECRET` | Yes | Session signing |
| `NEXTAUTH_URL` | Yes | Public base URL — used in success/cancel redirects, email links, JSON-LD |
| `ENCRYPTION_KEY` | Recommended | 64-char hex; AES-256-GCM key for signature data |
| `STRIPE_SECRET_KEY` | For payments | `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | For payments | `whsec_…` from the dashboard webhook |
| `EMAIL_API_KEY` | For email | Resend API key |
| `EMAIL_FROM` | For email | Verified sender address |
| `ADMIN_NOTIFICATION_EMAILS` | Optional | Comma-separated recipients for new-order alerts; fallback = all admin users |
| `ANTHROPIC_API_KEY` | Optional | Chatbot + label scanner |
| `FASHN_API_KEY` | Optional | Model photo generation |
| `IMAGE_SERVICE_URL` | Optional | Railway Image Service |
| `IMAGE_SERVICE_SECRET_KEY` | Optional | Upload auth |
| `IMAGE_SERVICE_SIGNATURE_SECRET_KEY` | Optional | Local URL signing (avoids extra round trip) |
| `UPLOAD_VOLUME_PATH` | Optional | Volume fallback (e.g. `/data`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Optional | Cloudinary fallback |
| `CLAIM_ADMIN_SECRET` | Optional | One-time admin claim secret |
| `WORLDPAY_XML_PASSWORD` | Legacy | Unused — kept in Dockerfile ARG for now |

---

## 16. Things an AI agent should NOT recreate from scratch

- **`package-lock.json`** — must be committed and copied verbatim. Regenerating from Windows produces a lockfile missing transitive deps of an optional wasm32 binding that Vitest 4 pulls in, which breaks `npm ci` on Linux. The current deploy uses `npm install` to side-step this; if you regenerate the lockfile, do so on Linux (or WSL).
- **Existing tests in `src/lib/stripe.test.ts`** — they have full mocks of `customers.create` / `customers.retrieve`; don't remove or you'll break the customer-reuse paths.
- **`audit.ts` `AuditAction` enum** — must contain `order_status_changed` and `payment_recorded` for the admin order endpoints to compile.
- **`PRODUCT_CATEGORIES` in `src/lib/types.ts`** — must match the schema enum on `Product.category`. Existing categories: `Blouse`, `Cardigan`, `Dress`, `Gilet`, `Jumper`, `Shrug`, `Skirt`, `T-shirt`, `Top`, `Trouser`, `Tunic`. The bulk import has uppercase / plural aliases mapped in `src/app/api/admin/products/bulk-import/route.ts`.
- **Stripe test card** — `4242 4242 4242 4242` for success; future expiry, any CVC, any postcode. Other test scenarios documented at https://docs.stripe.com/testing#cards.

---

See also:

- [README.md](README.md) — Quick start
- [FEATURES.md](FEATURES.md) — User-facing feature catalogue
- [USER_GUIDE.md](USER_GUIDE.md) — How customers and admins use the site
- [DEPLOY.md](DEPLOY.md) — Step-by-step Railway deploy
- [ROADMAP.md](ROADMAP.md) — Upcoming features
- [SECURITY.md](SECURITY.md) — Security posture summary
