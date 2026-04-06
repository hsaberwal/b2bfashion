# Claudia B2B — Feature Showcase

A comprehensive overview of every feature in the Claudia B2B wholesale fashion platform.

---

## AI-Powered Features

### AI Fashion Chatbot
A floating chat widget available on every page, powered by **Claude (Anthropic)**.

- **Full catalogue awareness** — fetches up to 100 products from the database including names, colours, sizes, materials, care guides, and prices
- **Website navigation** — knows every page and can guide customers to the right place
- **B2B context** — understands wholesale pricing visibility rules, pack ordering, payment options, and the approval process
- **Fashion advice** — suggests complementary pieces, outfit combinations, and styling ideas
- **Payment guidance** — explains the 10% deposit, pay-in-full, and invoice options
- **Rate limited** — 20 messages per 5 minutes per IP, 2000 character message limit
- **Implementation**: Claude Sonnet via `@anthropic-ai/sdk`, system prompt with full business context

### AI Label Scanner
Photograph garment care labels to automatically extract product data using **Claude Vision**.

- **Multi-photo capture** — take multiple label photos from your phone camera, then scan all at once
- **Camera integration** — "Take Photo" button opens the rear camera directly on mobile (`capture="environment"`)
- **Gallery upload** — pick existing photos from your gallery (supports multiple selection)
- **Extracts everything visible**:
  - Materials/fabric composition (e.g. "95% Polyester, 5% Elastane")
  - Care instructions — translates care symbols (washing, ironing, bleaching icons) into readable English
  - Sizes
  - Colour
  - SKU / stock code / article number
  - Product code / style number
  - Product name
  - Retail price
- **Auto-fills the form** — all extracted data populates the product form without overwriting existing values
- **Preview thumbnails** — see all queued label photos before scanning, with remove buttons
- **Implementation**: Claude Vision API, multiple images sent in a single request

### AI Model Photo Generation
Generate professional model photos from garment images using **FASHN AI**.

- **Demographic targeting** — every request automatically includes "Woman aged 35-55, diverse ethnicity and race"
- **Front/Back selector** — toggle buttons tell the AI which side of the garment the photo shows
- **Per-image generation** — hover any product image and click "AI Generate" to create model photos from that specific image
- **Custom prompts** — describe the background, styling, accessories. Quick-select example prompts: Studio, Autumn, Outdoor, Elegant, City Street
- **Generate 1-4 photos** per run
- **Auto-save** — generated photos automatically added to the product and saved to the database
- **Saves images first** — uploads are saved to DB before sending to FASHN so the API can access them
- **Status tracking** — real-time status messages ("Saving images...", "Generating... this may take 1-2 minutes")
- **Implementation**: FASHN API (`product-to-model` model), polling with 2-second intervals, up to 2 minutes timeout

---

## Product Management

### Product Form
A comprehensive admin form for creating and editing garments.

- **Quick actions at the top** — label scanner and photo upload are the first things you see
- **Multi-file upload** — upload multiple garment photos at once
- **Drag-to-reorder images** — drag and drop to change image order; first image is the main photo used everywhere
- **Position badges** — numbered badges (1, 2, 3...) on each image
- **Arrow buttons** — hover to see left/right move buttons for mobile/touch reordering
- **Three homepage checkboxes**:
  - "Front Page" — big hero banner + two-column feature
  - "Featured Styles" — product grid section
  - "Our Latest Looks" — rotating image gallery
- **All product fields**: SKU, product code, name, short/long description, materials, care guide, category, stock section, colour, colour options, sizes, pack size, price, compare-at price

### Product Categories
Tops, Blouses, T-shirts, Knitwear, Cardigans, Jumpers, Trousers, Dresses, Skirts, Jackets, Sale, Other

### Stock Sections
- **Current** — current season stock
- **Previous** — previous year (often discounted)
- **Forward** — upcoming stock (permission-controlled visibility)

---

## Homepage — Dynamic & Curated

The homepage is fully dynamic, pulling content from the database. No static placeholder images.

### Hero Section
- Full-width hero banner using the first "Front Page" product's image
- Two-column feature below with the 2nd and 3rd Front Page products
- Each links to the product detail page
- Clean dark background fallback when no products are featured
- Hover zoom effect on the two-column images

### Featured Styles
- 4-column product grid (up to 8 products)
- **Hover image swap** — shows the second product image on hover
- Product name, category, and colour below each image
- Links to product detail pages

### Our Latest Looks
- **Rotating image gallery** — each product card automatically cycles through all its photos
- Crossfade transitions (1 second fade, 3-4 second intervals)
- Cards rotate at slightly different timing so they're not in sync
- Shows product name, category, colour, and photo count
- Links to product detail pages

### Brand Statement
Centered serif heading with description text — the Bonobos/BR Factory aesthetic.

### CTA Section
"Start Ordering Today" with Apply for Access and Log In buttons.

---

## Product Detail Page — Banana Republic Style

### Image Gallery
- **Thumbnail strip** on the left — hover or click to switch the main image
- **Main image** with zoom-on-hover lens (2.2x magnification, 180px lens)
- **Mobile thumbnails** — horizontal scrollable row below the main image
- **"All Views" grid** at the bottom — every product image in a 3-column grid, click to scroll to top

### Product Info (Sticky)
- Category label, product code, product name in serif font
- Price (only shown for approved wholesale accounts)
- Compare-at price with strikethrough
- Colour display
- **Size selector** — button group with active state
- **Quantity controls** — +/- buttons with pack size enforcement
- **Full-width "Add to Order"** button
- **Expandable accordions** — "Product Details" and "Care Instructions" with chevron toggles
- SKU at the bottom

### Guest Cart Integration
- "Add to Order" works without logging in — saves to localStorage
- Green success message: "Added 6 x Product Name to your order" with "View Cart" link
- No "Unauthorized" errors ever shown to customers

---

## Cart & Checkout

### Guest Cart
- **No login required** — browse and add to cart freely
- Items stored in `localStorage` with product thumbnails
- Edit quantities, remove items
- "Ready to order?" prompt with Log In and Create Account buttons
- **Auto-merge on login** — guest cart items transfer to server cart automatically

### Server Cart (Logged In)
- Full cart management — edit quantities, remove items
- Pack size enforcement on all quantity changes
- "Proceed to Checkout" button

### Checkout Flow
1. **Delivery address** — address, city, postcode, country, company name, VAT number
2. **Order summary** — itemized list with totals
3. **Three payment options**:
   - **Pay in full** — full amount via Worldpay
   - **Pay 10% deposit** — deposit via Worldpay, 90% on delivery
   - **Invoice (pay later)** — confirms immediately, payment on delivery
4. **Digital signature** — draw with mouse or touch to confirm
5. **Submit** — signs order, initiates payment, redirects to Worldpay or confirmation

### Payment Integration (Worldpay)
- **Worldpay hosted payment page** — customer is redirected to Worldpay's secure page
- Card details never touch our servers
- Redirect back to `/checkout/result` with success/failure/pending status
- Friendly error message if Worldpay is unavailable: "Please contact the office"
- Deposit amount always calculated server-side (never trust client value)

### Payment Result Page
- Success: green checkmark with amount paid
- Failed: red X with retry suggestion
- Pending: yellow clock with processing message
- "View Orders" and "Continue Shopping" buttons

---

## Authentication & Accounts

### Registration
- Email, password (requires uppercase + lowercase + number, min 8 chars)
- Optional: name, company name, application message
- No account enumeration — same response for existing/new emails

### Login
- Email/password authentication
- OTP (one-time password) via email as alternative
- Rate limited: 10 attempts per 15 minutes

### Password Reset
- Email-based reset link (1 hour expiry)
- **Invalidates all sessions** on password change
- Same password complexity requirements as registration

### User Permissions (Admin-Controlled)
- **Pricing approved** — toggles price visibility
- **View forward stock** — access to upcoming collection
- **View current/previous stock** — granular stock access

---

## Navigation & UX

### Sticky Navigation Bar
- **Claudia** logo (serif font, links to homepage)
- **Garments** link (product listing)
- **About** link
- **Admin** link (admin users only)
- **Cart icon** with real-time item count badge
- **User name/icon** when logged in (person icon + name or email)
- **"Log in"** when not logged in

### PWA Install Prompt
- **Mobile only** — never shows on desktop
- Android: "Install" button triggers native Chrome install dialog
- iOS: Shows share icon with "Add to Home Screen" instruction
- Dismissible with 7-day cooldown
- Auto-hides if app is already installed
- Proper PNG icons (192x192, 512x512) for all platforms

### Design System
- **Fonts**: DM Sans (body) + DM Serif Display (headings) via Google Fonts
- **Colours**: White, cream (#f7f6f3), offwhite (#f2f1ee), muted (#767676), charcoal (#2d2d2d), black (#1a1a1a)
- **Buttons**: 3 variants — `btn-primary` (solid black), `btn-outline` (border), `btn-white` (for overlays)
- **Typography**: Uppercase letter-spaced section labels, serif display headings
- **Transitions**: 300ms ease-in-out on all interactive elements
- **Inspired by**: Bonobos and Banana Republic Factory

---

## Security

### Authentication Security
- bcrypt password hashing (cost factor 12)
- Cryptographically secure OTP (`crypto.randomInt`)
- Timing-safe comparisons on all secret/token checks
- Session invalidation on password reset
- nanoid(32) session tokens

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| Login | 10 per 15 min |
| OTP send | 5 per 15 min |
| OTP verify | 10 per 15 min |
| Register | 5 per hour |
| Password reset request | 5 per hour |
| Password reset confirm | 10 per 15 min |
| Claim admin | 5 per hour |
| Chat | 20 per 5 min |
| Payment status | 60 per min |

### Data Protection
- **CSRF**: Double-submit cookie pattern with timing-safe validation
- **CSP**: Content Security Policy header (script, style, img, font, connect, frame sources)
- **HSTS**: Strict-Transport-Security with 1-year max-age
- **Encryption**: AES-256-GCM for digital signature data at rest
- **Price hiding**: Wholesale prices only visible to approved accounts
- **No enumeration**: Auth endpoints return identical responses for existing/non-existing accounts
- **Upload validation**: File magic bytes verification (JPEG, PNG, WebP, GIF)
- **Path traversal**: Image key regex validation
- **Audit logging**: Security events stored in MongoDB (AuditLog model)

### Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(self), microphone=(), geolocation=()
- X-Powered-By: removed

---

## About Us Page

Professional page at `/about` with:
- Hero banner with tagline
- "Our Story" — brand narrative
- "How It Works" — 3-step visual guide (Browse, Register, Order)
- "Why Retailers Choose Us" — curated collections, pricing, flexible payment, pack ordering
- "Get in Touch" — CTA with Apply and Browse Garments buttons

---

## Technical Highlights

- **Zero static image dependency** — homepage is fully dynamic from the database
- **Server-side price calculation** — deposit amounts never trusted from client
- **Graceful degradation** — features work without optional API keys (chatbot, FASHN, payments)
- **Mobile-first** — camera integration, touch signature, responsive design
- **PWA** — installable as native app on all platforms
- **Type-safe** — full TypeScript with Zod validation on all API inputs
- **Lazy initialization** — Resend, Anthropic, and other clients initialized on first use (not at module level) to prevent build failures
