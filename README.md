# Claudia B2B — Wholesale Fashion Platform

A modern, AI-powered B2B wholesale platform for **Claudia** ladies fashion. Built with Next.js 15, MongoDB, and deployed on Railway.

**Live:** [claudia-c.com](https://claudia-c.com)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (Node.js) |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | Custom session-based auth (bcrypt, crypto-secure tokens) |
| **Payments** | Worldpay (FIS/Global Payments) — hosted payment page |
| **AI** | Claude API (Anthropic) — chatbot, label scanning |
| **Image AI** | FASHN API — AI model photo generation |
| **Image Storage** | Railway Image Service (or Cloudinary fallback) |
| **Hosting** | Railway with custom domain |
| **PWA** | Installable on mobile with app icons and service worker |

## Key Features

See [FEATURES.md](FEATURES.md) for the full feature showcase with details on every capability.

**Highlights:**
- AI-powered chatbot that knows the entire catalogue
- AI label scanner — photograph garment labels to auto-fill product data
- AI model photo generation (FASHN) with demographic targeting
- Guest cart — browse and add to cart without registering
- 3 payment options: pay in full, 10% deposit, or invoice
- Drag-to-reorder product images
- 3 independent homepage sections (Front Page, Featured Styles, Our Latest Looks)
- Comprehensive security hardening (CSP, HSTS, rate limiting, encryption)

## Project Structure

```
src/
  app/                    # Next.js App Router
    api/                  # API Routes
      admin/              # Admin-only endpoints
        claim/            # One-time admin claim
        generate-model-photos/  # FASHN AI integration
        images/           # Signed image URLs (admin)
        products/         # Product CRUD
        scan-label/       # AI label scanning (Claude Vision)
        upload/           # Image upload
        users/            # User management
      auth/               # Authentication
        login/            # Email/password login
        register/         # Account registration
        session/          # Session + CSRF token
        otp/              # OTP send/verify
        password-reset/   # Password reset flow
      chat/               # AI chatbot endpoint
      orders/             # Order management + payment
      products/           # Public product listing + detail
        featured/         # Featured products API
        hero/             # Hero section products API
        latest-looks/     # Latest looks products API
      images/             # Public signed image proxy
    about/                # About Us page
    account/              # User account management
    admin/                # Admin dashboard + product management
    apply/                # Wholesale application form
    cart/                 # Cart + checkout
    checkout/             # Payment result page
    login/                # Login page
    products/             # Product listing + detail pages
    register/             # Registration page
  components/             # React components
    admin/                # Admin components (ProductForm)
    Chatbot.tsx           # AI chatbot widget
    FeaturedProducts.tsx  # Featured products grid
    HeroSection.tsx       # Dynamic hero from DB
    InstallPrompt.tsx     # PWA install banner (mobile only)
    LatestLooks.tsx       # Rotating image gallery
    Navbar.tsx            # Sticky nav with cart badge
  lib/                    # Shared utilities
    audit.ts              # Security audit logging
    auth.ts               # Password hashing, sessions, cookies
    csrf.ts               # CSRF protection (double-submit cookie)
    encrypt.ts            # AES-256-GCM encryption for signatures
    fashn.ts              # FASHN AI API client
    guestCart.ts           # localStorage guest cart
    imageDisplayUrl.ts    # Image URL resolver
    imageService.ts       # Railway Image Service client
    mongodb.ts            # MongoDB connection
    rateLimit.ts          # In-memory rate limiter
    requireAdmin.ts       # Admin authorization
    types.ts              # Shared TypeScript types
    worldpay.ts           # Worldpay XML API client
  models/                 # Mongoose models
    AuditLog.ts           # Security audit trail
    Order.ts              # Orders with payment fields
    Product.ts            # Products with featured/latestLooks flags
    Session.ts            # Auth sessions
    User.ts               # Users with permissions
  data/
    homepageImages.ts     # Static image references (legacy)
```

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Required
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (or `MONGO_URL` / `MONGO_PUBLIC_URL` on Railway) |
| `JWT_SECRET` | Random string for session signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (e.g. `https://claudia-c.com`) |

### Optional — Features
| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key — enables chatbot + label scanning |
| `FASHN_API_KEY` | FASHN API key — enables AI model photo generation |
| `EMAIL_API_KEY` | Resend API key — enables OTP and password reset emails |
| `EMAIL_FROM` | Sender email address |
| `IMAGE_SERVICE_URL` | Railway Image Service URL |
| `IMAGE_SERVICE_SECRET_KEY` | Image Service auth key |
| `ENCRYPTION_KEY` | 64-char hex — encrypts signatures at rest (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

### Optional — Payments
| Variable | Description |
|----------|-------------|
| `WORLDPAY_MERCHANT_CODE` | Worldpay merchant code |
| `WORLDPAY_XML_PASSWORD` | Worldpay XML password |
| `WORLDPAY_ENV` | `test` or `live` |

## Local Development

```bash
# Install dependencies
npm install

# Start MongoDB (Docker)
docker run -d -p 27017:27017 --name mongo mongo:latest

# Copy env and configure
cp .env.example .env

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First-time setup
1. Register at `/register`
2. Set yourself as admin: either set `CLAIM_ADMIN_SECRET` env var and visit `/claim-admin`, or update MongoDB directly:
   ```javascript
   db.users.updateOne({ email: "you@email.com" }, { $set: { role: "admin" } })
   ```
3. Go to `/admin/products` to add garments

## Deploy to Railway

1. Push to GitHub, connect repo in [Railway](https://railway.app)
2. Add MongoDB service (Railway plugin or Atlas)
3. Set environment variables (see table above)
4. Deploy — Railway runs `npm run build` && `npm run start`

## Security

The application has been through two comprehensive security audits. See the codebase for implementations:

- **Authentication**: bcrypt password hashing, crypto-secure OTP, timing-safe comparisons
- **Rate limiting**: All auth endpoints rate-limited (login, OTP, register, password reset)
- **CSRF**: Double-submit cookie pattern with timing-safe validation
- **Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Encryption**: AES-256-GCM for signature data at rest
- **Input validation**: Zod schemas on all endpoints, field max lengths, password complexity
- **Upload security**: Magic bytes verification (JPEG, PNG, WebP, GIF)
- **Audit logging**: Security events logged to MongoDB (login, orders, payments, admin actions)
- **Path traversal**: Image key validation prevents directory traversal
- **Price protection**: Prices hidden until wholesale account approved
- **No enumeration**: Auth endpoints return identical responses for existing/non-existing accounts

## API Overview

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (prices hidden for unapproved) |
| GET | `/api/products/[id]` | Product detail |
| GET | `/api/products/featured` | Featured products for homepage |
| GET | `/api/products/hero` | Hero section products |
| GET | `/api/products/latest-looks` | Latest looks products |
| POST | `/api/chat` | AI chatbot |
| GET | `/api/auth/session` | Current session + CSRF token |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |

### Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List user's orders + cart |
| POST | `/api/orders` | Add to cart |
| PATCH | `/api/orders/[id]` | Update cart |
| POST | `/api/orders/[id]/sign` | Sign order |
| POST | `/api/orders/[id]/pay` | Initiate payment |
| GET | `/api/orders/[id]/payment-status` | Check payment status |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/products` | Create product |
| PATCH | `/api/admin/products/[id]` | Update product |
| DELETE | `/api/admin/products/[id]` | Delete product |
| POST | `/api/admin/upload` | Upload image |
| POST | `/api/admin/generate-model-photos` | Generate AI model photos |
| POST | `/api/admin/scan-label` | Scan garment label with AI |

## Documentation

- [FEATURES.md](FEATURES.md) — Full feature showcase
- [USER_GUIDE.md](USER_GUIDE.md) — User documentation
- [SECURITY.md](SECURITY.md) — Security documentation (if present)
- [.env.example](.env.example) — Environment variable reference
