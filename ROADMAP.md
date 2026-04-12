# Claudia.C B2B — Roadmap

Upcoming features planned for the Claudia.C B2B platform once the core site is stable.

---

## Admin Reporting & Operations

A comprehensive reporting and fulfilment dashboard for admins.

### Orders Dashboard

A central view of all orders with filtering, sorting, and bulk actions.

**Filters:**

- Date range (today, this week, this month, custom)
- Status (pending, signed, confirmed, shipped, delivered, cancelled)
- Payment status (none, pending, paid, failed, refunded)
- Payment option (pay now, pay deposit, invoice)
- Customer (by email, name, or company)

**Columns:**

- Order number, Date, Customer, Company
- Items count, Pack count, Total (£)
- Payment status, Amount paid, Amount outstanding
- Delivery address (city/country)
- Fulfilment status (ready to ship, shipped, delivered)

**Row actions:**

- View order details (full itemised list, signature, delivery snapshot)
- Mark as shipped / delivered
- Generate shipping label
- Generate packing slip / invoice
- Refund / cancel
- Resend confirmation email

### Financial Reports

- **Revenue**: Total sales by day/week/month/year
- **Outstanding balances**: Invoice customers with unpaid orders
- **Deposit tracking**: Customers who paid deposits with remaining balance due
- **Payment method breakdown**: Pay-in-full vs deposit vs invoice
- **Per-customer totals**: Sales grouped by customer/company
- **Category breakdown**: Revenue by product category

### Shipping & Fulfilment

- **Shipping labels** — Auto-generate printable labels with customer address, order number, and pack count
  - Integration with UK carriers (Royal Mail, DPD, Parcelforce, or chosen provider)
  - Batch printing for multiple orders
- **Packing slips / pick lists** — Printable document showing:
  - Order number, customer, ship-to address
  - Each SKU with pack size and quantity
  - Total items to pick
  - Barcode for scanning
- **Commercial invoices** — For orders requiring customs documentation
- **Order tracking** — Status updates visible to customer in their account

### Customer Reports

- New registrations by day/week
- Approval queue (users waiting for pricing approval)
- Top customers by order value
- Customer lifetime value
- Dormant accounts (no recent activity)

### Product Reports

- Best sellers (most-ordered SKUs)
- Slow movers (products with low order counts)
- Stock category distribution
- Low performers (no sales in N days)

### Inventory Management (Future)

- Stock levels per SKU
- Low stock alerts
- Auto-decrement on order confirmation
- Stock intake/receiving workflows
- Warehouse location tracking

### Audit Log Viewer

Admin UI for browsing the existing `AuditLog` collection:

- Security events (logins, failed attempts, password resets)
- Admin actions (role changes, user deletions, product changes)
- Payment events
- Filter by action type, user, date range

---

## Customer Features

### Reorder Previous Orders

Quick "Reorder" button on past orders to add the same items to cart instantly.

### Order Tracking Page

Customer-facing order status page with:

- Current status (received, processing, shipped, delivered)
- Shipping tracking number and link
- Estimated delivery date
- Invoice / packing slip download

### Wishlist / Favourites

Save products for later without adding to cart.

### Size Recommendations

AI-powered suggestions based on customer's previous orders and stated preferences.

### Email Notifications

- Order confirmation
- Payment receipt
- Shipping notification with tracking
- Delivery confirmation
- Review request after delivery

---

## Platform Improvements

- **Multi-language support** — i18n for European markets
- **Multi-currency** — Display prices in GBP, EUR, USD based on customer location
- **Bulk product import** — CSV upload for adding many products at once
- **Product variants** — Different colourways of the same style linked as variants
- **Stock intake scanner** — Mobile tool to scan barcodes on arriving stock
- **Two-factor authentication** — TOTP for admin accounts
- **Advanced search** — Full-text search with relevance ranking
- **Product recommendations** — "You might also like" on product detail pages

---

## Integrations

### Accounting

- Xero / QuickBooks export for orders and payments
- Automated invoice generation

### Marketing

- Mailchimp / Klaviyo newsletter integration
- Abandoned cart recovery emails
- Customer segmentation for targeted promotions

### Shipping

- EasyPost / ShipStation / Shippo for multi-carrier rate shopping
- Label printing with thermal printer support
- Returns / RMA workflow

### Analytics

- Google Analytics 4 integration
- Conversion funnel tracking
- Heatmap integration (Hotjar / Microsoft Clarity)

---

## Mobile App (Native)

Beyond the PWA, a native iOS and Android app with:

- Push notifications for order updates
- Offline catalogue browsing
- Camera-first product scanning for quick reorders
- Biometric login (Face ID / fingerprint)

---

## Priority Order

**Phase 1 (In progress):**

- ✅ SEO foundation (sitemap, robots, structured data, metadata, breadcrumbs)
- Legal pages (Privacy, Terms, Cookie consent)
- Footer with company details
- Newsletter signup

**Phase 2:**

1. Orders dashboard with filtering
2. Shipping label generation
3. Packing slip / pick list generation
4. Financial reports (revenue, outstanding)
5. Audit log viewer

**Phase 2:**

1. Customer reorder button
2. Email notifications (order confirmation, shipping)
3. Inventory management
4. Bulk product import

**Phase 3:**

1. Multi-currency / multi-language
2. Accounting integrations
3. Marketing integrations
4. Advanced search

**Phase 4:**

1. Native mobile app
2. Product variants
3. Returns / RMA workflow

---

*This roadmap is a living document and will be updated as priorities shift based on business needs and customer feedback.*
