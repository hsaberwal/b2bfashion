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

## Bulk Product Import

Upload the client's Excel stock sheet to create or update the entire catalogue in one go.

- Accepts `.xlsx` files with the 12 standard columns (Brand Code, Brand, Category, SPC, Description, Colour, Size Scale, Pieces Per Pack, Season, FabComp, Wholesale price, Packs In Stock)
- **Auto-detects the header row** regardless of where it sits in the file
- **Size Scale parser** handles both UK numeric ranges and letter ranges (e.g. "10-18 (1-2-2-2-1)" or "S-XL (1-2-2-1)")
- **Category normalisation** from uppercase (TROUSER → Trouser)
- **Composite SKU** — each SPC + colour becomes its own product (e.g. `COL13276-BLACK`)
- **Idempotent** — re-running the same file updates stock without creating duplicates
- **Dry run mode** — preview before committing with per-row status
- **Preserves admin edits** — photos, featured flags, hero settings, and min packs are not overwritten on re-import
- **Validation errors per row** with row numbers and messages
- **Audit logged** with filename and summary counts

## Stock Tracking & Reservation

Real inventory management with atomic reservations.

- **Three values per product**: `packsInStock` (physical), `packsReserved` (held by signed orders), `available` (derived)
- **Reserve on sign** — when a customer signs an order, packs are atomically reserved
- **MongoDB conditional update** prevents race conditions on the last pack
- **Consume on pay** — successful Stripe payment or invoice confirmation decrements both `packsInStock` and `packsReserved`
- **Release on failure** — failed payment or cancellation releases the reservation back to available
- **Customer display**: In Stock badge, Low Stock warning (under 5 packs), Out of Stock (button disabled)
- **Admin display**: Stock column in products list with available/total/reserved, colour-coded by health (red/amber/green)
- **Edit from admin** — `packsInStock` is an editable field in the product edit form

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
  - Select which specific image to use as the primary hero image
  - **Exclude individual images** with checkboxes (e.g. label/back shots that don't work as wide banners)
  - Click the wide preview to set the focal point
  - Red dot indicator shows where the image centers when cropped
  - Status: "N of M images will appear on the hero"
- **All product fields**: SKU, name, descriptions, materials, care guide, category, stock section, colour, colour variants, sizes, size ratio, pack size (auto), min packs, price per pack

### Product Categories
Blouse, Cardigan, Dress, Gilet, Jumper, Shrug, Skirt, T-shirt, Top, Trouser, Tunic. (The bulk-import normaliser maps uppercase / plural variants from the stock sheet.)

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
3. **Payment options** (admin-configurable in **Settings** — each can be toggled on/off; default is pay-in-full only; enforced server-side via `src/lib/paymentOptions.ts`):
   - **Pay in full** — redirects to Stripe Checkout for the full amount
   - **Pay 10% deposit** — redirects to Stripe Checkout for deposit only
   - **Invoice (pay later)** — confirms immediately
4. **Special instructions** — optional free-text notes (delivery dates, packing requests, etc.) stored on the order and printed on the sales-sheet PDF + admin pick list
5. **Digital signature** — draw with mouse or touch
6. **Submit** — signs, initiates payment, redirects to Stripe Checkout or confirmation

### Payment Integration (Stripe)

- **Stripe Checkout** — customer redirected to Stripe-hosted page (PCI scope offloaded)
- **Per-customer reuse** — each user gets a `stripeCustomerId` on their first checkout that's reused on every subsequent order, so the Stripe dashboard shows one clean customer record per buyer with their full payment history
- **GB default** — Stripe Customer is pre-created with `address.country: "GB"` so the billing dropdown defaults to United Kingdom; `locale: "en-GB"` renders the checkout UI in British English; `customer_update.address: "auto"` still lets the shopper enter any other country
- **Server-to-server webhook** with signature verification on every event (`checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`)
- **Idempotent payment recording** — every successful Stripe capture upserts a `Payment` row keyed on `stripePaymentIntentId` so webhook retries can't double-count
- **Server-side deposit calculation** (10% of total, rounded to whole pence) — never trust the client
- **Double-payment prevention** (409 if already pending/paid)
- **Friendly fallback** if Stripe is unavailable: customer is offered the "Invoice (pay later)" path
- **Test card**: `4242 4242 4242 4242`, any future expiry, any CVC, any postcode

---

## Admin Orders Workflow

Built end-to-end so an admin can run the daily order operation from a single screen, no spreadsheet juggling.

### Orders List (`/admin/orders`)

- Summary cards: **New today** count, **Outstanding orders** count, **Total outstanding** (£)
- Status-bucket filter tabs: All / New / In fulfilment / Outstanding / Complete
- Search across customer name, email, company, or SKU
- Columns: order #, customer, status, payment (with tone — green for paid, amber for outstanding, red for failed/refunded), total, paid, outstanding, date
- "New" chip on orders signed today
- Click any row to open the detail page

### Order Detail (`/admin/orders/[id]`)

- **Header** — order number, signed timestamp, current status, outstanding balance
- **Print-ready pick list** (visible on screen; `window.print()` button strips chrome) showing:
  - SKU + product name + colour + pack contents (e.g. `1×UK-10  2×UK-12  …`)
  - Packs and total pieces per line
  - Customer name / company / delivery address
  - Order totals
- **Downloadable PDF sales order / pick sheet** ("Download PDF" button → `GET /api/admin/orders/[id]/pdf`) — a bordered A4 form matching the CLAUDIA.C `Order Sheet.xlsx` template (company header, Order Date, Supply to / Invoice Address, Description / Misc / Style / Colour / Quantity / Price ex-VAT columns, Special Instructions + buyer signature footer). **Packs are broken down into one row per size** (size appended to the Description, e.g. `Floral Midi Dress — UK-12`), so the same document doubles as the warehouse pick sheet. Auto-paginates (16 rows/page) for large orders, with the order total + total pieces on the last page.
- **Customer card** — name, company, email, VAT, with link to the customer detail page
- **Payment card** — total / paid / outstanding breakdown, payment option + status
- **Fulfilment card** — current status with stamped timestamps; one-click "Mark as {next step}" button advances the lifecycle. Shipping step prompts inline for carrier + tracking number. Cancel button always available before delivery.
- **Payments recorded** table — every Stripe capture + manual payment with amount, method, reference, note, timestamp
- **Record a payment** form — appears whenever outstanding > 0. Amount pre-filled with the outstanding balance; method = bank transfer / cash / cheque / Stripe (manual) / other; optional reference + note. Records into the `Payment` ledger and auto-flips order to "paid" when balance hits zero.

### Order Status Lifecycle

```text
signed → confirmed → picked → ready_to_ship → shipped → delivered
                                                              (or cancelled at any point)
```

- `pending` — open cart, not yet signed (excluded from admin list by default)
- `signed` — signed, awaiting payment / acceptance on credit
- `confirmed` — paid in full / deposit paid / accepted as invoice
- `picked` — admin has pulled the items
- `ready_to_ship` — packed and waiting on the courier
- `shipped` — handed to courier (with optional carrier + tracking)
- `delivered` — arrived with the customer (terminal)
- `cancelled` — separate terminal state

Stamped timestamps: `signedAt`, `pickedAt`, `readyAt`, `shippedAt`, `deliveredAt`.

### Customer Detail (`/admin/users/[id]`)

- Customer profile (name, company, email, VAT, role, pricing approval, verified)
- Delivery address on file
- Lifetime spend + total outstanding balance (across all unfulfilled / unpaid orders)
- Stripe customer ID (when available)
- Order history table: order #, date, status, payment option, total / paid / outstanding — click any row to open that order

### Automated Order Emails (with PDF)

- When a customer signs an order, the sign route (fire-and-forget) renders the sales-order PDF once via `buildOrderPdf`, then sends two emails via Resend:
  - **`sendNewOrderEmail`** to the admin team — order short-code, customer, items count, total, payment option/status, signed timestamp, a direct link to `/admin/orders/[id]`, **and the PDF attached**
  - **`sendCustomerOrderEmail`** to the customer's account email — a confirmation with the **same PDF attached**, so both sides keep a copy
- Admin recipients resolve in priority order: (1) the **DB-managed list** edited in **Admin → Settings** (stored as a `SiteContent` doc keyed `orderNotifications`), (2) the legacy `ADMIN_NOTIFICATION_EMAILS` env var, (3) every admin user in the DB
- Admins manage the list at `/admin/settings` (add / remove addresses, validated + de-duplicated) via `GET`/`PUT /api/admin/notification-recipients` — no redeploy or env-var edit needed
- Skipped silently in development if `EMAIL_API_KEY`/`EMAIL_FROM` are unset (logs the payload to console) — never blocks the customer's sign action

### "Coming Soon" Banner

- Admin toggle in **Settings** (stored as a `SiteContent` doc keyed `comingSoon` with `{ enabled, message }`) shows logged-out visitors a dismissible banner across the public site
- Logged-in users (admins **and** approved customers) bypass it, so the team can keep editing and using the live site while the public sees the notice
- Rendered by `src/components/ComingSoonBanner.tsx` in the public site chrome; dismissal is remembered per-browser

### Custom Homepage Hero Banners

- Admins can upload custom hero banners (JPG/PNG/WebP) at **`/admin/banners`** in addition to the auto-cycling stock product photos
- Each banner supports an optional click-through link, headline, and subtext overlay; banners can be reordered and removed
- A **mode** toggle controls the homepage hero: **product photos only** (default), **banners only**, or **mixed** (banners then product photos in one rotation)
- Config is stored as a `SiteContent` doc keyed `heroBanners` and sanitised on read by `src/lib/heroBanners.ts`; the hero (`/api/products/hero`) returns it alongside the product list and `HeroSection` composes the rotation
- _Note: PDFs can't render as web banners — banners are images. Export PDF artwork to JPG first._

### Customer-Facing Order Tracking

On `/cart`, expanding any past order shows a **fulfilment progress indicator** rendering all 6 lifecycle steps with a filled dot on the current step. Customers can self-serve "where is my order?" without contacting support.

---

## Dashboard

`/admin` home shows:

- **New orders today** banner — only appears when there are new signed orders today, links straight to the orders list
- **Outstanding balance** banner — only appears when there are unpaid orders; shows total £ and count, links to outstanding filter
- Stat cards: **Orders today** (with outstanding count subtitle), Active products, Customers, Pending approval, Low stock
- Quick actions and low-stock items list

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
- **Shop All** link (product listing — renamed from "Garments")
- **About** link (editable page)
- **Admin** link (admin users only)
- **Cart icon** with **live** item count badge — refreshes via a `cart:updated` window event from add-to-cart (same-tab) + cross-tab storage event + 5s safety poll, for both guest and logged-in carts
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

### Editable Footer CMS
- Admins see an "Edit Footer" button at the bottom of every public page
- Inline editor for brand name, legal company name, tagline, address (one line per row), company number, VAT number, email, phone
- Content stored in `SiteContent` under key `"footer"`; the public footer reads from the same place

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

- Stripe-hosted Checkout — card details never reach our servers (PCI scope offloaded)
- **Server-to-server webhook** with signature verification (`STRIPE_WEBHOOK_SECRET`)
- Stripe Session retrieved server-side on success redirect (the redirect alone is treated as provisional)
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

### Legal Pages
Privacy Policy, Terms & Conditions, Returns Policy, Shipping Policy — all linked from the footer.

### Cookie Consent (GDPR / PECR)
- Bottom-right banner shown on first visit (suppressed on `/admin`)
- Two equal-prominence buttons — **Accept all** / **Reject optional** — PECR requires reject to be as easy as accept
- Choice persisted in localStorage as `cookie-consent`
- **"Cookie settings"** link in the footer re-opens the banner so a user can change their mind
- Today the site only sets strictly-necessary cookies (auth, CSRF, cart) — when GA4 lands in Phase 4 we'll honour the rejection

### Newsletter Signup
- Footer email form
- POSTs to `/api/newsletter` (rate-limited 5/min per IP), upserts an email into the `NewsletterSubscriber` collection
- Stores `email`, `source` (default `"footer"`), IP, `unsubscribed` flag
- No sending yet — emails accumulate for export to Mailchimp/Klaviyo when Phase 4 email marketing ships

### Trust Badges
Row above the footer's company info: **Secure checkout via Stripe**, **256-bit SSL encryption**, **UK wholesale supplier**, **GDPR compliant**.

### API Overview
See [ARCHITECTURE.md](ARCHITECTURE.md#4-api-surface) for the full API reference.

---

## SEO

### Search Engine Optimisation
- **Dynamic sitemap.xml** — automatically includes all current and forward stock products plus static pages
- **robots.txt** — explicit indexing rules with private routes (admin, cart, checkout, login) excluded
- **Per-page metadata** — every page has unique title, description, and canonical URL
- **Open Graph + Twitter Card tags** — links shared on social media show beautiful preview cards
- **Structured data (JSON-LD)**:
  - Organization schema (site-wide)
  - WebSite schema (site-wide)
  - Product schema on every product detail page (with brand, image, SKU, category, colour, currency)
  - BreadcrumbList schema on product pages
- **Breadcrumb navigation** — Home > Garments > Category > Product Name
- **Server-rendered metadata** — Next.js `generateMetadata()` fetches product data server-side so search engines see correct titles
- **Descriptive alt tags** — all customer-facing images have product-specific alt text
- **Custom domain** with HTTPS (`claudia-c.com`)
- **PWA manifest** for mobile install

## Technical Highlights

- **Zero static image dependency** — homepage is fully dynamic from the database
- **Server-side calculations** — deposits, totals, and prices never trusted from client
- **Graceful degradation** — features work without optional API keys
- **Mobile-first** — camera integration, touch signature, responsive design
- **PWA** — installable as native app on all platforms
- **Type-safe** — full TypeScript with Zod validation on all API inputs
- **Lazy initialization** — Resend, Anthropic, Stripe clients initialized lazily to prevent build failures
