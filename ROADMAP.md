# Claudia B2B — Pending requirements

Single ordered list to work through. Tick when done.

---

## 1. Forward / upcoming stock access

- [x] **#2 — Forward stock “password protected”**  
  Implemented: already gated by login + “view forward stock” permission. Products page shows note "Forward stock is sign-in and permission protected" for users who have the option.

---

## 2. Product listing & filters

- [x] **#4 — Product listing for all products**  
  Implemented: "All stock" option in the stock dropdown shows previous + current + forward (forward only if user has permission).

- [x] **#10 — More filters**  
  Currently “only colours showing”. Add filters (e.g. category, size, SKU, or other attributes) so all relevant filters are available.

---

## 3. Ordering & checkout

- [x] **#8 — Complete ordering system**  
  Cart and orders exist; delivery before sign, 10% deposit and pay now/later added. WorldPay not integrated yet (placeholder).

- [x] **Checkout: delivery before signing**  
  Sign page requires delivery details (address, city, postcode, country, optional company/VAT) before submitting signature. Snapshot saved on order and to user profile.

- [x] **Payment: 10% upfront / WorldPay**  
  Pay now or pay later with 10% deposit (computed and stored on order). WorldPay integration still to do when you have credentials.

---

## 4. Customer account & mandatory details

- [x] **Account: mandatory fields**  
  Account page at /account: name, company name, delivery address (line 1, line 2, city, postcode, country), VAT number. Required for checkout; saved to profile and copied to order at sign.

---

## 5. Stock visibility control

- [x] **Bulk “view forward” for all customers**  
  Implemented: Admin → Manage users → button "Enable forward stock for all customers" (POST /api/admin/users/bulk-enable-forward).

- [x] **Control who sees current / previous / forward**  
  Implemented: Admin → Manage users has toggles for View current, View previous, View forward. User model: canViewCurrentStock, canViewPreviousStock (default true). Products API and UI respect these.

- [x] **Previous stock — everyone can see**  
  Verified: previous-year stock has no permission check; everyone can see it.

---

## 6. Screenshot & security

- [x] **#15 — Screenshot privacy protection**  
  Implemented: user-select/touch-callout/drag none on .screenshot-protected; right-click disabled on those elements (ScreenshotProtection component).

- [x] **#16 — Strong website security**  
  Implemented: Security headers in next.config (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). SECURITY.md documents auth, validation, and recommended next steps (rate limiting, CSRF).

---

## 7. Content & discovery

- [x] **Front page — ~12 photos**  
  Implemented: Homepage has “What we do” section with 12 image slots. Edit src/data/homepageImages.ts or add images to public/images/home/ (1.jpg–12.jpg). Change as needed every few months.

- [x] **Customer application form + approval**  
  Implemented: /apply page is the customer application form (name, company, email, password, optional message). Submits to register; admin approves via Manage users (Allow pricing). Application message shown in admin user list.

---

## 8. Bulk ordering clarification

- [x] **#11 — Bulk only, pricing per item**  
  Documented: Bulk ordering only (pack sizes); pricing is per single item. Shown in README and product/cart UI (e.g. “£X.XX per item”, “Pack size: N”). No UX change needed.

---

## 9. AI & extras

- [ ] **AI chatbox**  
  Add an AI chat widget (e.g. for support or product help). Not started — needs provider/API choice.

---

## Done (for reference)

- Separate sections: Previous year, Current, Forward/upcoming stock  
- Password reset  
- MongoDB, unique SKU, product categories  
- Digital signature for order acceptance  
- Email OTP verification  
- Pricing only after approval  
- 4+ images per product  
- Admin can promote users to admin; forward stock on by default for admins  

---

*Last updated: from client feedback. Work through list in order or pick by dependency.*
