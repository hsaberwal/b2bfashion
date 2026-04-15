# Claudia.C B2B — Roadmap

Living document tracking upcoming features. Items move between phases as priorities shift.

---

## Priority Order

### Phase 1: Foundation — Make the site discoverable, legal, and stocked

- ✅ **SEO foundation** — sitemap, robots, JSON-LD, per-page metadata, breadcrumbs, OG/Twitter tags
- 🔜 **Bulk product import (Excel)** — import client stock sheet with all core fields
- 🔜 **Stock tracking & reservation** — track packs in stock, reserve on order sign, release on cancel/failure
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

**Source data**: Client provides an Excel export from their existing system. Sample file reviewed: `STOCK SHEET FOR CL WEB SS26.xlsx` with ~128 products.

**Exact columns in the sheet**:

| Column | Product field | Notes |
|---|---|---|
| Brand Code | `brandCode` | e.g. "CL" |
| Brand | `brand` | e.g. "CLAUDIA-C" |
| Category | `category` | TROUSER, TOP, BLOUSE, DRESS, SKIRT, CARDIGAN, JUMPER, T-SHIRT, TUNIC, GILET, SHRUG |
| SPC | `sku` | e.g. "COL12789" — unique stock code |
| Description | `name` | e.g. "27 Inch Embroidery Detail Pocket Trouser" |
| Colour | `colour` | e.g. "NAVY", "WHITE", "BLACK" |
| Size Scale | `sizes` + `sizeRatio` | e.g. "10-18 (1-2-2-2-1)" — parsed into UK-10, UK-12, UK-14, UK-16, UK-18 with ratio [1,2,2,2,1] |
| Pieces Per Pack | `packSize` | e.g. 8 — auto-verified against size ratio sum |
| Season (Ref 1) | `season` | e.g. "SS26" |
| FabComp (Ref 4) | `materials` | e.g. "68% COTTON 29% NYLON 3% SPANDEX" |
| Wholesale (GBP) (Exc Vat) (User 4) | `pricePerPack` | e.g. 11.95 |
| Packs In Stock | `packsInStock` | e.g. 6 — inventory level |

**Size Scale parser**: The "Size Scale" column contains both the sizes and the ratio in one string.

Examples from the actual data:

- `"10-18 (1-2-2-2-1)"` → sizes: `["UK-10", "UK-12", "UK-14", "UK-16", "UK-18"]`, ratio: `[1, 2, 2, 2, 1]`, packSize: 8
- `"10-20 (1-2-2-2-1-1)"` → sizes: `["UK-10", ..., "UK-20"]`, ratio: `[1, 2, 2, 2, 1, 1]`, packSize: 9
- `"12-20 (1-2-2-2-1)"` → sizes: `["UK-12", "UK-14", "UK-16", "UK-18", "UK-20"]`, ratio: `[1, 2, 2, 2, 1]`, packSize: 8
- `"S-XL  (1-2-2-1)"` → sizes: `["S", "M", "L", "XL"]`, ratio: `[1, 2, 2, 1]`, packSize: 6

**Decision (confirmed)**: Each SPC + colour combination becomes its own product. The stored SKU is `{SPC}-{COLOUR}` (e.g. `COL13276-BLACK`, `COL13276-NAVY`). This keeps stock tracking simple — each colour has its own inventory. Customers see them as separate products in the listing.

**New Product fields needed**:

- `brandCode` (e.g. "CL")
- `brand` (e.g. "CLAUDIA-C")
- `season` (e.g. "SS26")
- `packsInStock` (total physical inventory in packs)
- `packsReserved` (packs held by signed-but-not-yet-fulfilled orders)
- `available` (computed: `packsInStock - packsReserved`)

**Remove from Product** (not in the sheet, not needed):

- `productCode` — we use SPC as the SKU directly
- `styleNumber` — same as above
- `barcode` — not provided
- `careGuide` — added manually via label scanner after import
- `longDescription` — not in the sheet, added manually
- `colours` (array) — each row is its own colour
- `compareAtPrice` — already removed

**Workflow**:

1. Admin goes to **Garments > Bulk Import**
2. Uploads `.xlsx` file (Sheet1, headers on row 4)
3. System shows a preview:
   - Total rows to import
   - Column mapping (auto-detected from headers)
   - Size scale validation (can we parse each row?)
   - Duplicate SKU+colour warnings
   - Category mapping (uppercase → title case, e.g. TROUSER → Trouser)
4. Admin confirms and clicks Import
5. System creates products one at a time:
   - Skips existing (SKU + colour) pairs OR updates them (admin choice)
   - Reports success/failure per row
6. After import, admin edits each product to add:
   - Photos (upload + AI model photo generation)
   - Long description
   - Care instructions (label scanner can extract these)
   - Min packs (defaults to 1 from sheet, admin can increase)
   - Stock category (defaults to "current", admin can change to "forward")
   - Homepage flags (Front Page / Featured / Latest Looks)
   - Hero focal point if featured

**Technical notes**:

- Use `xlsx` library (already installed)
- Header row is row 4 (index 3), not row 1
- Skip rows where Brand Code is empty (summary/total rows)
- Auto-set `stockCategory` to "current" for all imports (SS26 season)
- Validate all rows before importing — show errors first
- Atomic per-row (one bad row doesn't break the others)
- Audit log entry per import with row counts and skipped SKUs
- Idempotent on (SKU + colour) composite key

### Stock Tracking & Reservation (Phase 1)

Stock must always be accurate. When a customer signs an order, the packs they've ordered need to be "reserved" so nobody else can over-order. Stock is only physically decremented when the order is paid (or invoice confirmed).

**Fields on the Product model**:

- `packsInStock` (number) — physical inventory (the number from the stock sheet)
- `packsReserved` (number, default 0) — packs held by signed orders awaiting fulfilment
- Derived: `available = packsInStock - packsReserved`

**Stock lifecycle**:

```text
Import → packsInStock = N, packsReserved = 0, available = N

Customer adds 3 packs to cart
  → Nothing changes (cart is not a reservation)

Customer signs order (3 packs)
  → Atomic check: available >= 3?
  → If yes: packsReserved += 3
  → If no: reject with "Only X packs available"

Order paid (Worldpay success)
  → packsInStock -= 3
  → packsReserved -= 3
  → Net available stays the same, but physical stock is now lower

Order paid as invoice (pay_later)
  → Treated like paid: decrement both

Order cancelled / payment fails
  → packsReserved -= 3 (release the reservation)
  → available goes back up

Admin manually adjusts stock (e.g. stock intake)
  → packsInStock += N
```

**Why reserve on sign, not on add-to-cart**:

- Carts can be abandoned for days — reserving on add-to-cart locks stock that may never be sold
- Signing is a deliberate action — customer has committed to buying
- Simpler: no TTL cleanup of abandoned cart reservations
- B2B customers expect firm stock once they sign

**Atomic reservation (prevents race conditions)**:

When two customers try to sign for the last pack simultaneously, MongoDB's conditional update ensures only one succeeds:

```javascript
db.products.updateOne(
  {
    _id: productId,
    $expr: { $gte: [{ $subtract: ["$packsInStock", "$packsReserved"] }, packsToReserve] }
  },
  { $inc: { packsReserved: packsToReserve } }
)
```

If the update returns `matchedCount: 0`, stock ran out between the check and the update — reject the order.

**Customer-facing display**:

- Product detail page shows "In Stock" if `available > 0`
- Shows "Low Stock — only X packs left" if `available < 5` (urgency)
- Shows "Out of Stock" if `available === 0` and hides "Add to Order" button
- Quantity selector clamps to `max = available`
- Cart page re-validates stock on load (in case availability changed)

**Admin-facing display**:

- Product list shows `packsInStock / packsReserved / available` columns
- Low stock alerts on the admin dashboard (available < 5)
- Ability to manually adjust `packsInStock` when new stock arrives
- "Stock History" log (extension of audit log) showing every inc/dec with reason

**Integration points**:

- `POST /api/orders/[id]/sign` — reserves stock atomically, fails order sign if insufficient
- `POST /api/orders/[id]/pay` (success) + webhook — decrements `packsInStock` and `packsReserved`
- `POST /api/orders/[id]/cancel` — releases reservation
- `POST /api/admin/products/[id]/restock` — admin adjustment, audit logged
- Bulk import — sets `packsInStock` from the sheet, never touches `packsReserved`
- Re-import updates `packsInStock` (with delta warning if there are reserved packs)

**Edge cases**:

- Order expires after N days unpaid → auto-cancel and release reservation (TTL on signed+unpaid orders)
- Admin deletes a product with reservations → warn and either force-release or refuse
- Bulk re-import that reduces stock below current reservations → warning, don't break existing orders

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
