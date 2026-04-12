# Claudia.C B2B — Feature Showcase

A comprehensive overview of every feature in the Claudia.C B2B wholesale fashion platform.

---

## AI-Powered Features

### AI Fashion Chatbot
A floating chat widget available on every page, powered by **Claude (Anthropic)**.

- **Full catalogue awareness** — fetches up to 100 products with names, colours, sizes, materials, care guides, pack sizes, and per-pack prices
- **Website navigation** — knows every page, payment options, and how the B2B approval process works
- **Fashion advice** — suggests complementary pieces, outfit combinations, styling ideas
- **Rate limited** — 20 messages per 5 minutes per IP, 2000 character message limit
- **Client**: Claude Sonnet via `@anthropic-ai/sdk`

### AI Label Scanner
Photograph garment care labels to automatically extract product data using **Claude Vision**.

- **Multi-photo capture** — take multiple label photos from your phone camera, scan all at once
- **Camera integration** — "Take Photo" button opens the rear camera directly on mobile
- **Gallery upload** — pick existing photos from your gallery (supports multiple selection)
- **Extracts everything visible**:
  - Materials/fabric composition
  - Care instructions — translates care symbols into readable English
  - Sizes, Colour, SKU, Product code, Name, Price
- **Auto-fills the form** — populates without overwriting existing values
- **Preview thumbnails** — see all queued labels before scanning

### AI Model Photo Generation
Generate professional model photos from garment images using **FASHN AI**.

- **Demographic targeting** — every request includes "Woman aged 35-55, diverse ethnicity and race"
- **Front/Back selector** — tells the AI which side of the garment the photo shows
- **Per-image generation** — hover any product image and click "AI Generate"
- **Custom prompts** — describe background and styling, with quick-select examples
- **Generate 1-4 photos** per run
- **Auto-save** — generated photos saved to the product immediately
- **Status tracking** — real-time progress messages

---

## Pack Ordering System

Packs contain a **pre-defined ratio of sizes** rather than letting customers pick sizes individually.

### Size Ratio Builder
- **Sizing systems**: UK, EU, US, or Letter sizes (XS-3XL)
- **Quick-add buttons** for common sizes in each system:
  - UK: UK-6, UK-8, UK-10, UK-12, UK-14, UK-16, UK-18, UK-20, UK-22, UK-24
  - EU: EU-34, EU-36, EU-38, EU-40, EU-42, EU-44, EU-46, EU-48, EU-50, EU-52
  - US: US-0, US-2, US-4, US-6, US-8, US-10, US-12, US-14, US-16
  - Letter: XS, S, M, L, XL, XXL, 3XL
- **Quantity per size** — set how many of each size go into one pack (e.g. 1 UK-10, 2 UK-12, 2 UK-14, 1 UK-16)
- **Auto-calculated pack size** — reads as "6 items per pack"
- **Custom sizes** — type any size manually
- **Minimum packs** — separate field for the minimum order quantity in packs (e.g. 2 packs minimum)

### Customer View
- Shows **"Each Pack Contains: 1×UK-10, 2×UK-12, 2×UK-14, 1×UK-16"**
- Shows **"6 items per pack · Minimum 2 packs per order"**
- **No size selection** — customers just pick number of packs
- Quantity defaults to minimum order

### Per-Pack Pricing
- Prices stored as **pricePerPack** (not per item)
- Product detail shows: **"£65.00 per pack"**
- Cart totals calculate: `pricePerPack × (quantity / packSize)`
- Order totals = price per pack × number of packs

---

## Product Management

### Product Form
- **Quick actions at the top**: label scanner and photo upload
- **Multi-file upload** — upload multiple garment photos at once
- **Drag-to-reorder images** — first image is the main photo
- **Position badges** (1, 2, 3...) with move buttons
- **Three homepage checkboxes**:
  - Front Page — hero banner + two-column feature
  - Featured Styles — product grid section
  - Our Latest Looks — rotating image gallery
- **Hero settings panel** — appears when Front Page is checked:
  - Select which specific image to use
  - Click the wide preview to set the focal point
  - Red dot indicator shows where the image centers when cropped
- **All product fields**: SKU, name, descriptions, materials, care guide, category, stock section, colour, colour variants, sizes, size ratio, pack size (auto), min packs, price per pack

### Product Categories
Tops, Blouses, T-shirts, Knitwear, Cardigans, Jumpers, Trousers, Dresses, Skirts, Jackets, Sale, Other

### Stock Sections
- **Current** — current season stock (default)
- **Forward** — upcoming stock (permission-controlled visibility)
- **Previous** — previous year stock (admin only; hidden from customer view)

---

## Homepage — Dynamic & Curated

### Hero Section
- **Cycles through all Front Page products and all their images**
- Crossfade transitions every 5 seconds (1-second fade)
- Uses selected hero image and focal point per product
- Clickable dot indicators to jump between slides
- "Shop Now" button links to the current product
- Slide indicator dots
- Two-column feature below shows other Front Page products

### Featured Styles
- 4-column product grid (up to 8 products)
- Hover image swap (shows second image on hover)
- Product name, category, and colour below each image

### Our Latest Looks
- Rotating image gallery — each card cycles through all product photos
- Crossfade transitions at slightly offset timing (3-4 seconds)
- Shows product name, category, colour, and photo count

---

## Product Detail Page

### Image Gallery
- **Thumbnail strip** on the left
- **Main image** with zoom-on-hover lens (2.2x magnification)
- **Mobile thumbnails** — horizontal scroll below the main image
- **"All Views" grid** at the bottom showing every image

### Product Info (Sticky)
- Category label, product code, name in serif font
- **Price per pack** (only shown for approved wholesale accounts)
- **Pack contents**: "Each Pack Contains: 1×UK-10, 2×UK-12..."
- **Items per pack · Minimum packs**
- **Quantity controls** — +/- buttons in pack multiples
- **Full-width "Add to Order"** button
- **Expandable accordions** — Product Details, Care Instructions

### Guest Cart Integration
- "Add to Order" works without logging in
- Success message with "View Cart" link
- No "Unauthorized" errors ever shown to customers

---

## Cart & Checkout

### Guest Cart
- **No login required** — items stored in localStorage with thumbnails
- Edit quantities, remove items
- "Ready to order?" prompt with Log In and Create Account buttons
- **Auto-merge on login** — guest cart items transfer to server cart

### Server Cart
- Full cart management with real-time price refresh from current product data
- Pack size enforcement on quantity changes
- Proceed to Checkout button

### Checkout Flow
1. **Delivery address** — address, city, postcode, country, company, VAT
2. **Order summary** — itemized with per-pack totals
3. **Three payment options**:
   - **Pay in full** — redirects to Worldpay for the full amount
   - **Pay 10% deposit** — redirects to Worldpay for deposit only
   - **Invoice (pay later)** — confirms immediately
4. **Digital signature** — draw with mouse or touch
5. **Submit** — signs, initiates payment, redirects to Worldpay or confirmation

### Payment Integration (Worldpay)
- **Hosted payment page** — customer redirected to Worldpay's secure page
- Card details never touch our servers
- **Server-to-server webhook** with MAC verification for authoritative payment status
- Friendly error message if Worldpay is unavailable
- **Deposit amount always calculated server-side** (never trust client)
- Double payment prevention (409 if already pending/paid)

---

## Authentication & Accounts

### Registration
- Email, password (requires uppercase + lowercase + number, min 8 chars)
- **Email verification required** — link sent via Resend
- **24-hour expiry** — links expire and accounts auto-delete
- "Check your email" confirmation screen with email icon
- No account enumeration

### Login
- Email/password authentication
- OTP (one-time password) via email as alternative
- Rate limited: 10 attempts per 15 minutes
- **Email verification check** — blocks login if not verified (new accounts only)
- **Background cleanup** — every login fires a cleanup of expired unverified accounts

### Email Verification
- Token sent via Resend email with a styled template
- Link expires after 24 hours
- Account deleted if not verified in time
- **Manual verify button** in admin panel to verify a user without the email link
- Login page shows green banner when redirected from verification link

### Password Reset
- Email-based reset link (1 hour expiry)
- **Invalidates all sessions** on password change
- Password complexity requirements apply
- Rate limited

### User Permissions (Admin-Controlled)
- **Pricing approved** — toggles price visibility (admins always see prices)
- **View forward stock** — access to upcoming collection
- Admin deletion with session/order cleanup

---

## Navigation & UX

### Sticky Navigation Bar
- **Claudia.C** logo (serif font)
- **Garments** link (product listing)
- **About** link (editable page)
- **Admin** link (admin users only)
- **Cart icon** with real-time item count badge (guest or server cart)
- **User name/icon** when logged in
- **Logout button** (desktop text, mobile icon)

### PWA Install Prompt
- **Mobile only** — never shows on desktop
- Android: native install prompt
- iOS: share button instruction
- 7-day dismissal cooldown
- Proper PNG icons (192x192, 512x512, 180x180 Apple)

### Admin Dashboard
- **Three card buttons**: Manage Garments, Manage Users, Manage About Page
- **Navigation links** at top for quick access
- **Quick Reference** section with workflow tips

### Admin Users
- **Expandable card layout** — no table overflow issues
- Summary row: avatar, email, badges (Admin/Unverified/You)
- Click to expand: full details (name, company, VAT, address, application message, join date)
- Inline permission toggles
- **Manual verify button** for unverified users
- **Delete user button** (with confirmation)
- **Make admin / Remove admin** buttons
- Bulk forward stock toggle

### Editable About Page CMS
- Admin sees **"Edit Page"** button at the top of the About page
- All text fields become inline inputs/textareas
- Save/Cancel buttons
- Content stored in MongoDB `SiteContent` collection

### Design System
- **Fonts**: DM Sans (body) + DM Serif Display (headings)
- **Colours**: White, cream, offwhite, muted, charcoal, black
- **Buttons**: btn-primary (solid black), btn-outline (border), btn-white (overlays)
- **Inspired by**: Bonobos and Banana Republic Factory

---

## Security

### 4 Comprehensive Security Audits
All findings from 4 rounds of security auditing have been fixed.

### Authentication Security
- bcrypt password hashing (cost 12)
- `crypto.randomInt()` OTP generation
- Timing-safe comparisons (`crypto.timingSafeEqual`)
- Email verification with 24hr expiry and auto-cleanup
- Session invalidation on password reset
- Password complexity: upper + lower + number, min 8 chars

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| Login | 10 per 15 min |
| Register | 5 per hour |
| OTP send | 5 per 15 min |
| OTP verify | 10 per 15 min |
| Password reset request | 5 per hour |
| Password reset confirm | 10 per 15 min |
| Claim admin | 5 per hour |
| Chat | 20 per 5 min |
| Payment status | 60 per min |

### Data Protection
- **CSRF middleware**: Next.js middleware enforces double-submit cookie on all POST/PATCH/DELETE
- **CsrfProvider**: Auto-injects token into fetch requests client-side
- **CSP + HSTS**: Full security headers
- **Encryption**: AES-256-GCM for signature data at rest
- **Price hiding**: Per-pack prices only visible to approved wholesale accounts (admins always see)
- **No enumeration**: Auth endpoints return identical responses for existing/non-existing accounts
- **Magic bytes upload validation**: JPEG, PNG, WebP, GIF verified against declared type
- **Path traversal protection**: Regex validation on image keys
- **Audit logging**: Login, orders, payments, admin actions, role changes

### Payment Security
- Worldpay hosted page — card details never reach our servers
- Domain validation (redirect must be `.worldpay.com`)
- **Server-to-server webhook** with MAC verification
- Double payment prevention (409 if already pending/paid)
- Server-side deposit calculation (never trust client)

---

## Documentation & Legal

### About Us Page
Editable by admins via inline CMS, with sections:
- Hero banner
- Our Story
- How It Works (3-step visual guide)
- Why Retailers Choose Us
- Get in Touch CTA

### API Overview
See [README.md](README.md) for the full API reference.

---

## Technical Highlights

- **Zero static image dependency** — homepage is fully dynamic from the database
- **Server-side calculations** — deposits, totals, and prices never trusted from client
- **Graceful degradation** — features work without optional API keys
- **Mobile-first** — camera integration, touch signature, responsive design
- **PWA** — installable as native app on all platforms
- **Type-safe** — full TypeScript with Zod validation on all API inputs
- **Lazy initialization** — Resend, Anthropic, Worldpay clients initialized lazily to prevent build failures
