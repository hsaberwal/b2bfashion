# Claudia.C B2B — Wholesale Fashion Platform

A modern, AI-powered B2B wholesale platform for **Claudia.C** ladies fashion. Built with Next.js 15, MongoDB, and deployed on Railway.

**Live:** [claudia-c.com](https://claudia-c.com)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (Node.js) |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | Custom session-based auth (bcrypt, crypto-secure tokens) |
| **Email** | Resend (verification, password reset, OTP) |
| **Payments** | Stripe Checkout — hosted page + signed webhook |
| **AI Chat & Vision** | Claude API (Anthropic) — chatbot, label scanning |
| **AI Images** | FASHN API — model photo generation |
| **Image Storage** | Railway Image Service (or Cloudinary fallback) |
| **Hosting** | Railway with custom domain |
| **PWA** | Installable on mobile with app icons and service worker |

## Key Features

See [FEATURES.md](FEATURES.md) for the full feature showcase.
See [USER_GUIDE.md](USER_GUIDE.md) for end-user documentation.
See [ARCHITECTURE.md](ARCHITECTURE.md) for the canonical technical reference (data models, API surface, lifecycle diagrams, integrations).
See [ROADMAP.md](ROADMAP.md) for upcoming features.

**Highlights:**

- SEO-optimised: dynamic sitemap, JSON-LD structured data, per-page metadata, breadcrumbs
- Bulk Excel import with size scale parser (UK ranges and letter ranges)
- Stock tracking with atomic reservation on order sign
- AI chatbot that knows the entire catalogue
- AI label scanner — photograph garment labels to auto-fill product data
- AI model photo generation with demographic targeting and front/back view
- Pack-based ordering with size ratios (UK/EU/US/Letter) and min pack quantities
- Per-piece pricing visible only to approved wholesale customers
- Guest cart — browse and add to cart without registering, with live cart-count badge
- Admin-configurable checkout payment options (pay in full / 10% deposit / invoice) — toggle each on/off in **Admin → Settings** (default: pay-in-full only), enforced server-side
- Stripe Checkout offers **card, Apple Pay, Google Pay, and Klarna** (whatever you enable in the Stripe Dashboard)
- Full order lifecycle visible to both sides: `signed → confirmed → picked → ready_to_ship → shipped → delivered`
- Admin orders dashboard with print-ready pick list, downloadable PDF sales order (matches the CLAUDIA.C order-sheet template — one row per SKU, which doubles as the packing list, with the customer's signature drawn on and special instructions in the footer), status controls (carrier + tracking on ship), and manual payment recording (cash / bank transfer / cheque / Stripe / other)
- Remove an individual pack from a live order without cancelling it: releases stock, credits the customer (account balance or Stripe refund — your choice), and emails a revised invoice to the customer and team
- Customer detail page with order history, lifetime spend, and outstanding balance
- **Sales agents** (field reps): an `agent` role + admin **Agents** section (invite agents, assign customers), plus an **agent portal** (`/agent`) where a rep picks a customer, builds a basket (search **or scan sample barcodes** with the device camera), the customer signs on the device, and the order is placed with any enabled payment option (unpaid invoice or Stripe card/Apple Pay/Klarna).
- On sign, the sales-order PDF is automatically emailed (via Resend) to admins **and** the customer; admin recipients managed in **Admin → Settings** (falls back to `ADMIN_NOTIFICATION_EMAILS`, then all admin users)
- Customers get exactly two order-lifecycle emails: an **order confirmation** at checkout and a **dispatch notification** (with tracking) when the order is marked shipped
- Email verification with 24-hour auto-cleanup
- Cycling hero banner with focal-point image selector — plus admin-uploaded custom hero banners (image + link + caption) via **Admin → Banners**, with a product-photos / banners / mixed mode toggle
- Special-instructions field at checkout, printed on the sales-sheet PDF and admin pick list
- Editable About page + Footer CMS
- 3 independent homepage curation sections
- Cookie consent banner (PECR-compliant), newsletter signup, trust badges
- Comprehensive security hardening (CSP, HSTS, CSRF middleware, rate limiting, encryption)
- 125+ tests with v8 coverage; new code paths at 84–100%

## Project Structure

For a complete walk-through (every file, every route, every model field) see [ARCHITECTURE.md](ARCHITECTURE.md). Quick map:

```text
src/
  middleware.ts                       # CSRF on POST/PATCH/DELETE
  app/
    layout.tsx page.tsx globals.css
    sitemap.ts robots.ts
    api/
      auth/                           # login, logout, register, session, verify-email,
                                      # otp/{send,verify}, password-reset/{request,perform}
      orders/                         # Customer cart + sign + pay + payment-status
      webhooks/stripe/                # Stripe webhook receiver
      products/                       # Public catalogue + featured/hero/latest-looks
      user/profile site-content newsletter chat images/signed uploads/[filename]
      admin/
        stats orders users products site-content images
        scan-label generate-model-photos upload seed cleanup-unverified claim
    about account admin apply cart checkout login register
    products privacy terms returns shipping forgot-password reset-password claim-admin
  components/
    SiteChrome Navbar Footer CookieConsent NewsletterSignup TrustBadges
    Chatbot HeroSection FeaturedProducts LatestLooks HomepageGallery InstallPrompt
    Breadcrumbs OrganizationJsonLd ProductJsonLd LegalPage PwaRegister
    ScreenshotProtection CsrfProvider
    admin/{AdminShell,ProductForm}
  lib/
    mongodb auth requireAdmin csrf encrypt rateLimit audit
    pricing orderStatus stripe adminNotifications
    fashn signupHygiene sizeScale productFilter
    guestCart imageDisplayUrl imageService fetchWithCsrf richText types
  models/
    User Session Product Order Payment NewsletterSubscriber SiteContent AuditLog
public/
  sw.js manifest.webmanifest icons/ images/
```

## Data Model Highlights

Full field-by-field spec lives in [ARCHITECTURE.md §3](ARCHITECTURE.md#3-data-models). Summary:

### Product
| Field | Type | Notes |
|---|---|---|
| `sku` | string (unique) | `{SPC}-{COLOUR}`, e.g. `COL13276-BLACK` |
| `category` | enum | `Blouse`, `Cardigan`, `Dress`, `Gilet`, `Jumper`, `Shrug`, `Skirt`, `T-shirt`, `Top`, `Trouser`, `Tunic` |
| `stockCategory` | enum | `previous` / `current` / `forward` |
| `sizes` / `sizeRatio` / `packSize` / `minPacks` | mixed | Pack composition (e.g. `[1,2,2,2,1]` summing to 8) |
| `pricePerPiece` | number | Per-piece wholesale price (GBP) |
| `packsInStock` / `packsReserved` | number | Atomic reservation via `$expr: { $gte: [ … packsInStock − packsReserved, packsToReserve] }` |
| `images` | string[] | Blob keys; served via `/api/images/signed` |
| `heroFocalPoint` / `heroImageIndex` / `heroExcludedIndexes` / `showOnHero` / `featured` / `latestLooks` | mixed | Homepage curation |
| `disabled` | boolean | Hides from public; admin still sees |

### User
| Field | Notes |
|---|---|
| `email` / `passwordHash` | Bcrypt cost 12 |
| `emailVerified` / `verificationToken` | 24h expiry, auto-deletes if not verified |
| `role` | `customer` \| `admin` |
| `pricingApproved` / `canViewForwardStock` / `canViewCurrentStock` / `canViewPreviousStock` | Admin-controlled toggles |
| `deliveryAddress` / `vatNumber` / `companyName` | Trade details |
| `stripeCustomerId` | Created on first Stripe checkout, reused thereafter |

### Order
| Field | Notes |
|---|---|
| `status` | `pending` → `signed` → `confirmed` → `picked` → `ready_to_ship` → `shipped` → `delivered` (or `cancelled`) |
| `items[]` | `productId`, `sku`, `quantity`, `pricePerPiece`, `packSize`, `size?` |
| `signatureDataUrl` | AES-256-GCM encrypted |
| `deliverySnapshot` | Address captured at sign time (immutable) |
| `paymentOption` | `pay_now` \| `pay_deposit` \| `pay_later` |
| `paymentStatus` | `none` \| `pending` \| `paid` \| `failed` \| `refunded` |
| `depositAmount` / `depositPaid` / `amountPaid` | Recomputed from `Payment` rows |
| `stripeSessionId` / `stripePaymentIntentId` | Webhook reconciliation |
| `pickedAt` / `readyAt` / `shippedAt` / `deliveredAt` | Stamped on transition |
| `shippingCarrier` / `shippingTrackingNumber` | Captured at "Mark shipped" |

### Payment

The source of truth for "how much has been paid against this order."

| Field | Notes |
|---|---|
| `orderId` / `userId` | Refs |
| `amount` / `currency` | GBP default |
| `method` | `stripe` \| `cash` \| `bank_transfer` \| `cheque` \| `other` |
| `reference` / `note` | Free-form for receipts |
| `stripePaymentIntentId` | Webhook upserts idempotently on this key |
| `refunded` | Excluded from `sumPayments()` |
| `recordedBy` | Admin who logged a manual payment |

### NewsletterSubscriber

| Field | Notes |
|---|---|
| `email` (unique) | Lowercased |
| `source` | Default `"footer"` |
| `ipAddress` | For abuse review |
| `unsubscribed` | Manual flag (no public unsubscribe flow yet — Phase 4) |

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Required

| Variable | Description |
|---|---|
| `MONGO_URL` / `MONGO_PUBLIC_URL` / `MONGODB_URI` | MongoDB connection string (any one) |
| `JWT_SECRET` | Random string for session signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public base URL, no trailing slash (e.g. `https://claudia-c.com`) — used in Stripe success/cancel redirects, email links, JSON-LD |
| `ENCRYPTION_KEY` | 64-char hex — AES-256-GCM key for encrypting order signatures at rest |

### Payments (Stripe)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` or `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the Stripe dashboard's webhook endpoint |

Webhook endpoint URL: `https://<your-domain>/api/webhooks/stripe`. Subscribe to: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`. Test card: `4242 4242 4242 4242` (any future expiry, any CVC, any postcode).

### Email (Resend)

| Variable | Description |
|---|---|
| `EMAIL_API_KEY` | Resend API key — verification, OTP, password reset, new-order admin notification |
| `EMAIL_FROM` | Verified sender address |
| `ADMIN_NOTIFICATION_EMAILS` | Optional, comma-separated. Legacy fallback for new-order alert recipients. Recipients are now managed in **Admin → Settings** (stored in the DB); this env var is only used when that list is empty, before falling back to every admin user. |

### AI

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Chatbot + label scanner (Claude) |
| `FASHN_API_KEY` | Model photo generation |

### Image storage (pick one)

| Variable | Description |
|---|---|
| `IMAGE_SERVICE_URL` + `IMAGE_SERVICE_SECRET_KEY` (+ `IMAGE_SERVICE_SIGNATURE_SECRET_KEY`) | Railway Image Service (recommended) |
| `UPLOAD_VOLUME_PATH` | Volume mount fallback (e.g. `/data`) |
| `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | Cloudinary fallback |

### Other

| Variable | Description |
|---|---|
| `CLAIM_ADMIN_SECRET` | One-time secret for self-elevating to admin via `/claim-admin` |

## Local Development

```bash
npm install
docker run -d -p 27017:27017 --name mongo mongo:latest
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First-time setup
1. Register at `/register` (verification email is logged in dev mode, not sent)
2. Click the link in the terminal to verify
3. Set yourself as admin: either set `CLAIM_ADMIN_SECRET` and visit `/claim-admin`, or update MongoDB:
   ```javascript
   db.users.updateOne({ email: "you@email.com" }, { $set: { role: "admin" } })
   ```
4. Go to `/admin` to see the three section cards (Garments, Users, About Page)

## Deploy to Railway

1. Push to GitHub, connect repo in Railway
2. Add MongoDB service (Railway plugin or Atlas)
3. Set environment variables
4. Deploy — Railway runs `npm run build` && `npm run start`

## Security

The application has been through **4 comprehensive security audits** with all findings fixed:

- **Authentication**: bcrypt, crypto.randomInt OTP, timing-safe comparisons, email verification with 24hr expiry
- **CSRF**: Next.js middleware enforces double-submit cookie on all POST/PATCH/DELETE
- **Rate limiting**: Auth (10/15min), OTP (5/15min), register (5/hr), password reset (5/hr), claim-admin (5/hr), chat (20/5min)
- **Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Encryption**: AES-256-GCM for signature data at rest
- **Input validation**: Zod schemas, field max lengths, password complexity (upper+lower+number)
- **Upload security**: Magic bytes verification (JPEG, PNG, WebP, GIF)
- **Audit logging**: Security events stored in MongoDB
- **Path traversal**: Regex validation on image keys
- **Price protection**: Prices hidden until wholesale account approved (admins always see prices)
- **No enumeration**: Auth endpoints return identical responses for existing/non-existing accounts
- **Payment security**: Stripe webhook with signature verification, hosted checkout (no card data on our servers), double-payment prevention
- **Auto cleanup**: Unverified accounts deleted after 24 hours

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Canonical rebuild reference: data models, every API route, lifecycle diagrams, integration flows
- [FEATURES.md](FEATURES.md) — Full feature showcase
- [USER_GUIDE.md](USER_GUIDE.md) — Customer + admin user guide
- [DEPLOY.md](DEPLOY.md) — Step-by-step Railway deployment
- [ROADMAP.md](ROADMAP.md) — Phase plan
- [SECURITY.md](SECURITY.md) — Security posture summary
