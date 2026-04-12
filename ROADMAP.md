# Claudia.C B2B — Roadmap

Living document tracking upcoming features. Items move between phases as priorities shift.

---

## Priority Order

### Phase 1: Foundation — Make the site discoverable, legal, and stocked

- ✅ **SEO foundation** — sitemap, robots, JSON-LD, per-page metadata, breadcrumbs, OG/Twitter tags
- 🔜 **Bulk product import (CSV/Excel)** — *Client will provide an export from their existing system with SKU, name, short description, long description, price. Admin needs to upload this file and have all products created in one go. After import, admin can edit each SKU to add photos, care instructions, sizes, and pack ratios.*
- 🔜 **Legal pages** — Privacy Policy, Terms & Conditions, Returns Policy, Shipping Policy, Wholesale Terms
- 🔜 **Cookie consent banner** (GDPR / PECR compliance)
- 🔜 **Footer with company details** — registered office, company number, VAT number, social links
- 🔜 **Newsletter signup** — for marketing
- 🔜 **Trust badges** — Worldpay logo, SSL, "Made in UK", etc.

### Phase 2: B2B Sales Essentials

- **Volume discounts** — "Order 10+ packs, get 5% off"
- **Saved order templates / reorder** — quick "Reorder" button on past orders
- **Bulk add to cart by SKU** — paste a list of SKUs and quantities
- **Minimum order value (£)** — floor for all orders
- **Quote requests** — for very large orders
- **Customer-specific pricing tiers** — different pricing for VIP customers
- **Net 30/60 payment terms** — beyond the existing 10% deposit / invoice options

### Phase 3: Operations — Reporting & Fulfilment

- **Orders dashboard** with filtering (date, status, payment, customer)
- **Financial reports** — revenue, outstanding balances, deposit tracking
- **Shipping labels** — auto-generate with carrier integration (Royal Mail, DPD, Parcelforce)
- **Packing slips / pick lists** — printable with barcodes
- **Commercial invoices** — for customs documentation
- **Customer reports** — registrations, approval queue, top customers, lifetime value
- **Product reports** — best sellers, slow movers
- **Inventory management** — stock levels per SKU, low stock alerts, auto-decrement
- **Audit log viewer** — admin UI to browse the existing AuditLog collection

### Phase 4: Analytics & Marketing

- **Google Analytics 4** integration
- **Google Search Console** verification + sitemap submission
- **Microsoft Clarity** for heatmaps and session recordings (free, GDPR-friendly)
- **Email marketing integration** (Mailchimp / Klaviyo)
- **Abandoned cart recovery emails**
- **Customer segmentation** for targeted promotions

### Phase 5: Customer Experience Polish

- **Order tracking page** with shipping carrier integration
- **Email notifications** — order confirmation, payment receipt, shipping, delivery, review request
- **Wishlist / Favourites** — save products for later
- **Recently viewed products**
- **Product recommendations** — "You might also like"
- **Reviews / testimonials** — social proof
- **Lookbook** — seasonal visual catalog (PDF download)
- **Catalogue PDF download** for offline sharing

### Phase 6: International & Integrations

- **Multi-currency** — GBP, EUR, USD based on customer location
- **Multi-language** — i18n for European markets
- **Accounting integration** — Xero / QuickBooks export for orders and payments
- **EDI integration** — for larger retailers
- **Tax/VAT calculation** — UK + EU compliance

### Phase 7: Advanced

- **Product variants** — different colourways linked as variants
- **Backorders / pre-orders** — "Out of stock — back in 2 weeks, reserve now"
- **Multi-user accounts** — companies with multiple buyers, order approval workflows
- **Trade references / credit checks** — for invoice payment customers
- **Account managers** — assign customers to sales reps
- **Custom catalogs** — different customers see different products
- **Two-factor authentication** for admin accounts
- **Advanced search** — full-text search with relevance ranking
- **Stock intake scanner** — mobile tool to scan barcodes on arriving stock

### Phase 8: Native Mobile App

- Push notifications for order updates
- Offline catalogue browsing
- Camera-first product scanning
- Biometric login (Face ID / fingerprint)

---

## Detailed Specs

### Bulk Product Import (Phase 1)

**Source data**: Client will provide a CSV or Excel export from their existing system containing:

- SKU (unique identifier)
- Product name
- Short description
- Long description
- Price per pack (or pack price information)

**Workflow**:

1. Admin goes to **Garments > Bulk Import**
2. Uploads CSV or `.xlsx` file
3. System shows a preview: column mapping (which CSV column → which product field), row count, validation warnings (duplicates, missing required fields)
4. Admin confirms mapping and clicks Import
5. System creates products one at a time:
   - Skips SKUs that already exist (or offers an "update existing" option)
   - Reports success/failure per row
6. After import, admin edits each SKU individually to add:
   - Photos (upload + AI model photo generation)
   - Care instructions (label scanner)
   - Materials
   - Pack size ratios (UK/EU/US sizing)
   - Min packs
   - Stock category and homepage flags

**Technical notes**:

- Support both `.csv` and `.xlsx` (use `xlsx` library)
- Validate all rows before importing — show errors first
- Atomic per-row (one bad row doesn't break the others)
- Audit log entry per import with row counts
- Allow re-running the same file safely (idempotent on SKU)

### Orders Dashboard (Phase 3)

A central view of all orders with filtering, sorting, and bulk actions.

**Filters**: Date range, status, payment status, payment option, customer
**Columns**: Order number, date, customer, company, items count, pack count, total, payment status, amount paid, amount outstanding, delivery address, fulfilment status
**Row actions**: View details, mark shipped, generate label, generate packing slip, refund, cancel, resend confirmation

### Shipping Labels (Phase 3)

- Auto-generate printable labels with customer address, order number, pack count
- Integration with UK carriers (Royal Mail, DPD, Parcelforce)
- Batch printing for multiple orders

### Packing Slips (Phase 3)

- Order number, customer, ship-to address
- Each SKU with pack size and quantity
- Total items to pick
- Barcode for scanning

---

*This roadmap is a living document and will be updated as priorities shift based on business needs and customer feedback.*
