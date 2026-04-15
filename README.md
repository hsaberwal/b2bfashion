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
| **Payments** | Worldpay (FIS/Global Payments) — hosted payment page + webhook |
| **AI Chat & Vision** | Claude API (Anthropic) — chatbot, label scanning |
| **AI Images** | FASHN API — model photo generation |
| **Image Storage** | Railway Image Service (or Cloudinary fallback) |
| **Hosting** | Railway with custom domain |
| **PWA** | Installable on mobile with app icons and service worker |

## Key Features

See [FEATURES.md](FEATURES.md) for the full feature showcase.
See [USER_GUIDE.md](USER_GUIDE.md) for end user documentation.
See [ROADMAP.md](ROADMAP.md) for upcoming features.

**Highlights:**
- SEO-optimised: dynamic sitemap, JSON-LD structured data, per-page metadata, breadcrumbs
- Bulk Excel import with size scale parser (UK ranges and letter ranges)
- Stock tracking with atomic reservation on order sign
- AI chatbot that knows the entire catalogue
- AI label scanner — photograph garment labels to auto-fill product data
- AI model photo generation with demographic targeting and front/back view
- Pack-based ordering with size ratios (UK/EU/US/Letter) and min pack quantities
- Per-pack pricing visible only to approved wholesale customers
- Guest cart — browse and add to cart without registering
- 3 payment options: pay in full, 10% deposit, or invoice
- Email verification with 24-hour auto-cleanup
- Cycling hero banner with focal-point image selector
- Editable About page CMS
- 3 independent homepage curation sections
- Comprehensive security hardening (CSP, HSTS, CSRF middleware, rate limiting, encryption)

## Project Structure

```
src/
  middleware.ts           # CSRF validation middleware
  app/                    # Next.js App Router
    api/                  # API Routes
      admin/              # Admin-only endpoints
        claim/            # One-time admin claim
        cleanup-unverified/  # Delete expired unverified accounts
        generate-model-photos/  # FASHN AI integration
        products/               # Product CRUD
          bulk-import/          # Excel bulk import with size scale parser
        images/           # Signed image URLs (admin)
        products/         # Product CRUD
        scan-label/       # AI label scanning (Claude Vision)
        site-content/     # Editable site content (About page)
        upload/           # Image upload with magic bytes validation
        users/            # User management + deletion
      auth/               # Authentication
        login/            # Email/password login
        register/         # Account registration + verification email
        verify-email/     # Email verification link handler
        session/          # Session + CSRF token
        logout/           # Logout
        otp/              # OTP send/verify
        password-reset/   # Password reset flow
      chat/               # AI chatbot endpoint
      orders/             # Order management + payment + sign
      products/           # Public product listing + detail
        featured/         # Featured products API
        hero/             # Hero section products API
        latest-looks/     # Latest looks products API
      site-content/       # Public site content reader
      webhooks/
        worldpay/         # Worldpay server-to-server webhook
      images/             # Public signed image proxy
    about/                # Editable About Us page
    account/              # User account management
    admin/                # Admin dashboard + product management
    apply/                # Wholesale application form
    cart/                 # Cart + checkout
    checkout/             # Payment result page
    login/                # Login page with verification banner
    products/             # Product listing + detail pages
    register/             # Registration page
  components/             # React components
    admin/                # Admin components (ProductForm)
    Chatbot.tsx           # AI chatbot widget
    CsrfProvider.tsx      # Auto-injects CSRF token into fetch
    FeaturedProducts.tsx  # Featured products grid
    HeroSection.tsx       # Cycling hero from DB with focal point
    InstallPrompt.tsx     # PWA install banner (mobile only)
    LatestLooks.tsx       # Rotating image gallery
    Navbar.tsx            # Sticky nav with cart badge + logout
  lib/                    # Shared utilities
    audit.ts              # Security audit logging
    auth.ts               # Password hashing, sessions, cookies
    csrf.ts               # CSRF tokens (double-submit cookie)
    encrypt.ts            # AES-256-GCM for signature data
    fashn.ts              # FASHN AI API client
    fetchWithCsrf.ts      # CSRF-aware fetch helper
    guestCart.ts          # localStorage guest cart
    imageDisplayUrl.ts    # Image URL resolver
    imageService.ts       # Railway Image Service client
    mongodb.ts            # MongoDB connection
    rateLimit.ts          # In-memory rate limiter
    requireAdmin.ts       # Admin authorization
    types.ts              # Shared TypeScript types
    worldpay.ts           # Worldpay XML API client + MAC verification
  models/                 # Mongoose models
    AuditLog.ts           # Security audit trail
    Order.ts              # Orders with payment fields
    Product.ts            # Products with size ratios, min packs, hero settings
    Session.ts            # Auth sessions
    SiteContent.ts        # Editable page content
    User.ts               # Users with email verification
  data/
    homepageImages.ts     # Static image references (legacy fallback)
```

## Data Model Highlights

### Product
| Field | Type | Description |
|---|---|---|
| `sku` | string | Unique stock keeping unit (e.g. `COL13276-BLACK`) |
| `brandCode` / `brand` / `season` | string | From import (CL / CLAUDIA-C / SS26) |
| `name` | string | Garment name |
| `category` | enum | Blouse, Cardigan, Dress, Gilet, Jumper, Shrug, Skirt, T-shirt, Top, Trouser, Tunic |
| `colour` | string | Primary colour |
| `sizes` | string[] | e.g. `["UK-10", "UK-12", "UK-14", "UK-16", "UK-18"]` |
| `sizeRatio` | number[] | e.g. `[1, 2, 2, 2, 1]` — items per size in each pack |
| `packSize` | number | Auto-calculated sum of sizeRatio |
| `minPacks` | number | Minimum packs per order |
| `pricePerPack` | number | Wholesale price per pack (GBP) |
| `packsInStock` | number | Total physical inventory in packs |
| `packsReserved` | number | Packs held by signed orders awaiting fulfilment |
| `materials` | string | Fabric composition (FabComp from the sheet) |
| `heroFocalPoint` | string | CSS `object-position` for hero crop |
| `heroImageIndex` | number | Which image to use on Front Page |
| `heroExcludedIndexes` | number[] | Images excluded from hero cycling |
| `showOnHero` | boolean | Front Page visibility |
| `featured` | boolean | Featured Styles section |
| `latestLooks` | boolean | Our Latest Looks section |

### User
| Field | Description |
|---|---|
| `email` / `passwordHash` | Credentials (bcrypt) |
| `emailVerified` / `verificationToken` | Email verification state |
| `role` | `customer` or `admin` |
| `pricingApproved` | Whether user sees prices |
| `canViewForwardStock` | Access to upcoming collection |
| `deliveryAddress`, `vatNumber`, `companyName` | Trade details |

### Order
| Field | Description |
|---|---|
| `status` | `pending` / `signed` / `confirmed` / `cancelled` |
| `items[]` | `productId`, `sku`, `quantity`, `pricePerPack`, `packSize` |
| `signatureDataUrl` | AES-256-GCM encrypted signature |
| `paymentOption` | `pay_now` / `pay_deposit` / `pay_later` |
| `paymentStatus` | `none` / `pending` / `paid` / `failed` / `refunded` |
| `worldpayOrderCode` | Unique code for Worldpay transaction |

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Required
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (or `MONGO_URL` / `MONGO_PUBLIC_URL` on Railway) |
| `JWT_SECRET` | Random string for session signing |
| `NEXTAUTH_URL` | App URL (e.g. `https://claudia-c.com`) |

### Optional — Features
| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key — enables chatbot + label scanning |
| `FASHN_API_KEY` | FASHN API key — enables AI model photo generation |
| `EMAIL_API_KEY` | Resend API key — enables verification and password reset emails |
| `EMAIL_FROM` | Sender email address |
| `IMAGE_SERVICE_URL` | Railway Image Service URL |
| `IMAGE_SERVICE_SECRET_KEY` | Image Service auth key |
| `ENCRYPTION_KEY` | 64-char hex — encrypts signatures at rest |
| `CLAIM_ADMIN_SECRET` | One-time secret for claiming admin access |

### Optional — Payments
| Variable | Description |
|----------|-------------|
| `WORLDPAY_MERCHANT_CODE` | Worldpay merchant code |
| `WORLDPAY_XML_PASSWORD` | Worldpay XML password |
| `WORLDPAY_ENV` | `test` or `live` |
| `WORLDPAY_MAC_SECRET` | Webhook MAC verification secret |

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
- **Payment security**: Worldpay webhook with MAC verification, domain validation, double-payment prevention
- **Auto cleanup**: Unverified accounts deleted after 24 hours

## Documentation

- [FEATURES.md](FEATURES.md) — Full feature showcase
- [USER_GUIDE.md](USER_GUIDE.md) — User documentation
- [ROADMAP.md](ROADMAP.md) — Upcoming features
- [.env.example](.env.example) — Environment variable reference
