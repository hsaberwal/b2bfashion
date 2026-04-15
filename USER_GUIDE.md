# Claudia.C B2B — User Guide

Welcome to Claudia.C B2B, your wholesale platform for ladies fashion. This guide covers everything you need to know as a customer or admin.

---

## For Customers

### Getting Started

#### Browsing Garments

1. Visit the website — no account needed to browse
2. Click **"Garments"** in the navigation bar
3. Use filters: Stock type (Current / All Stock / Forward if permitted), Category, Colour
4. Use search to find by name, SKU, or style number
5. Click any garment to see full details, multiple photos, pack contents, materials, and care

#### Using the Chatbot

Click the **black chat icon** in the bottom-right corner of any page.

Ask about garments, styles, payment options, or how the site works.

Example questions:
- "What dresses do you have in black?"
- "How does the ordering process work?"
- "What payment options do you have?"
- "What's the minimum order?"

### Understanding Packs

Claudia.C B2B sells in **packs** — a pack contains a pre-defined mix of sizes.

Example pack:
- **UK-10 × 1**
- **UK-12 × 2**
- **UK-14 × 2**
- **UK-16 × 1**
- **Total: 6 items per pack**

You don't pick sizes — you pick how many packs you want. A product might also have a **minimum pack quantity** (e.g. 2 packs minimum), meaning you must order at least that many packs.

### Adding to Cart

1. Open a garment and review the pack contents
2. Set the quantity — must be a multiple of the pack size (auto-enforced)
3. Click **"Add to Order"**
4. A green confirmation appears with a **"View Cart"** link
5. **No account needed** — items save in your browser

### Your Cart

- Click the **bag icon** in the navbar (badge shows item count)
- Edit quantities, remove items
- The cart shows each item's total price (calculated as `pack price × number of packs`)

### Creating an Account

To place an order, you need a wholesale account:

1. Click **"Log in"** → **"Create an account"**
2. Enter email, password (uppercase + lowercase + number, min 8 chars), name, company
3. Optional: application message
4. Click Register
5. **Check your email** — click the verification link within 24 hours
6. If you don't verify in time, your account is deleted and you'll need to register again
7. Return to the site and log in

**Pricing note**: Even after verification, prices remain hidden until an admin approves your wholesale account.

### Checking Out

1. Go to your Cart → **"Proceed to Checkout"**
2. Enter delivery address, city, postcode, country
3. Add company name and VAT number (optional)
4. Choose **payment method**:

| Option | What happens |
|--------|-------------|
| **Pay in full** | Pay the full amount now by card (Worldpay) |
| **Pay 10% deposit** | Pay 10% now, remaining 90% on delivery |
| **Invoice (pay later)** | Order confirms immediately, invoice sent, pay on delivery |

5. **Sign** your order by drawing in the signature box
6. Click the payment button — redirected to Worldpay for card payments, or confirmation for invoice

### After Ordering

- View **past orders** on the Cart page with status (Pending / Signed / Confirmed)
- Card payments show success/failure/pending on the confirmation page
- Admin processes and ships the order

### Installing the App on Your Phone

On mobile you'll see: **"Add Claudia.C to your home screen"**

- **Android**: Tap **"Install"**
- **iPhone**: Tap the share button, then **"Add to Home Screen"**

The app appears on your home screen with the Claudia.C icon.

### Logging Out

Click the **"Log out"** button (or icon on mobile) next to your name in the navbar.

---

## For Admins

### Accessing the Admin Panel

1. Log in as an admin
2. Click **"Admin"** in the navbar
3. See three **card buttons**:
   - **Manage Garments** → add/edit products
   - **Manage Users** → approve pricing, delete spam
   - **Manage About Page** → edit page content inline

### Bulk Importing from Excel (Recommended)

Go to **Admin > Garments > Bulk Import**.

1. **Upload** your `.xlsx` stock sheet
2. Click **"Preview (Dry Run)"** — shows what will be created, updated, and any errors
3. Review the per-row table — errors are shown first
4. Click **"Confirm Import"** to commit

**How it works:**

- Each row becomes a product using `SPC-COLOUR` as the SKU (e.g. `COL13276-BLACK`)
- **New products** are created with all fields from the sheet
- **Existing products** are updated: packs in stock, price, materials, sizes, name
- **Preserves** your admin edits: photos, featured flags, hero settings, min packs
- **Re-uploading** the same file is safe — it just syncs stock and prices

**After import, for each product you can add:**

- Photos (upload + AI model photo generation)
- Care instructions (via label scanner)
- Long description
- Homepage flags (Front Page / Featured / Latest Looks)
- Min packs per order

### Adding a Single Garment Manually

Go to **Admin > Garments > New product**.

#### 1. Scan Care Labels (AI)

- Click **"Take Photo"** — opens your phone camera
- Take photos of all labels (materials, care symbols, sizes, price tags)
- Click **"Add Another"** for each label
- Review thumbnails, remove any with the X button
- Click **"Scan N Labels"** — Claude AI extracts:
  - Materials (95% Polyester, 5% Elastane)
  - Care instructions (translates washing/ironing symbols)
  - Sizes, Colour, SKU, Product code, Name, Price
- Review auto-filled fields before saving

#### 2. Upload Product Photos

- Click **"Upload Product Photos"** — supports multiple files
- Drag images to reorder — first image is the main photo
- Numbered position badges show order
- Hover to see remove (X) and left/right arrow buttons

#### 3. Set Up the Pack

- Select a **sizing system**: UK / EU / US / Letter
- Click the quick-add buttons to add sizes (e.g. UK-10, UK-12, UK-14, UK-16)
- Set **quantity per pack** for each size — the pack size auto-calculates
- Set **Min packs** — minimum packs per order (e.g. 2)
- Example: `1×UK-10, 2×UK-12, 2×UK-14, 1×UK-16 = 6 items per pack, min 2 packs`

#### 4. Set the Price

- Enter **Price per pack** (GBP) — this is the wholesale price for one whole pack
- Example: £65.00 for a pack of 6 items

#### 5. Homepage Visibility

Check any or all three boxes:
- **Front Page** — big hero banner + two-column feature
- **Featured Styles** — product grid
- **Our Latest Looks** — rotating image gallery

When **Front Page** is checked, a settings panel appears:
- Select which specific image to use as the primary hero
- **Exclude images** using the checkbox in the top-right of each thumbnail (great for hiding label shots, back views, or anything that doesn't look right as a wide banner)
- **Click on the wide preview** to set the focal point (where the image centers when cropped)
- Red dot shows the focal point position
- Counter at the bottom: "N of M images will appear on the hero"

### Generating AI Model Photos

1. Upload a garment photo
2. **Save the product first**
3. Hover any image → click **"AI Generate"**
4. Select **Front** or **Back** (which side of the garment)
5. Choose a styling prompt (optional) or click an example:
   - Studio, heels, minimal
   - Autumn, boots
   - Outdoor casual
   - Elegant indoor
   - White backdrop
   - City street
6. Choose how many photos (1-4)
7. Click **Generate** — wait 1-2 minutes

**Default**: All generated photos feature women aged 35-55 with diverse ethnicities.

### Managing Users

Go to **Admin > Manage Users**. Each user shows as a card with:
- Avatar, email, badges (Admin / Unverified / You)
- Summary row: name, company, join date
- Click to **expand** full details

**Expanded view shows**:
- Email, Name, Company, VAT Number
- Full delivery address
- Application message
- Email verified status
- Join date

**Permission toggles**:
- **Pricing** — allow user to see prices
- **Forward Stock** — access to upcoming collection
- **Current Stock** — basic stock access

**Actions**:
- **Verify Now** — manually verify user's email (for when they can't click the link)
- **Make Admin / Remove Admin** — change role
- **Delete User** — removes account, sessions, and pending orders

### Editing the About Page

1. Go to `/about` while logged in as admin
2. Click **"Edit Page"** at the top
3. All text fields become editable (inputs and textareas)
4. Change any text: hero title, story, "why choose us" points, CTA
5. Click **"Save Changes"** or **"Cancel"**
6. Changes persist in the database

### Homepage Curation

The homepage has three independent sections:

| Section | How to control | Behavior |
|---|---|---|
| **Front Page** | Check "Front Page" on product edit + set hero image and focal point | Cycles through all images from all Front Page products every 5 seconds |
| **Featured Styles** | Check "Featured Styles" | Up to 8 products in a 4-column grid with hover image swap |
| **Our Latest Looks** | Check "Our Latest Looks" | Each card cycles through all the product's images |

A product can be in any or all sections.

### Pricing Approval

New customers see no prices until approved. To approve:

1. Go to **Manage Users**
2. Click the user to expand
3. Toggle **"Pricing: Yes"**

Approved customers now see prices on all product pages and in the cart.

### Email Verification

- New registrations get a 24-hour verification link
- Unverified accounts are **auto-deleted after 24 hours** (no cleanup needed)
- To manually verify a user (e.g. if the email went to spam): open the user in Manage Users, click **"Verify Now"**

### Product Fields Reference

| Field | Description |
|---|---|
| SKU | Unique stock keeping unit |
| Product code | Style number |
| Name | Garment name |
| Short description | Brief tagline |
| Long description | Detailed description |
| Materials | Fabric composition (auto-filled by label scanner) |
| Care guide | Care instructions (auto-filled, symbols translated) |
| Category | Tops, Dresses, Knitwear, etc. |
| Stock section | Current, Previous, or Forward |
| Primary colour | Main colour |
| Colour options | Comma-separated list of variants |
| Sizes + Size ratio | Pack contents (e.g. 1×UK-10, 2×UK-12) |
| Pack size | Auto-calculated total items per pack |
| Min packs | Minimum packs per order |
| Price per pack | Wholesale price for one pack (GBP) |
| Images | Upload, drag to reorder |
| Hero settings | Image + focal point (when Front Page checked) |
| Homepage flags | Front Page, Featured Styles, Our Latest Looks |

---

## Troubleshooting

### "Why can't I see prices?"

Prices are only visible to approved wholesale accounts. After registering and verifying your email, contact the office for pricing approval.

### "My verification email didn't arrive"

Check spam. If you can't find it:
- Register again (old account auto-deletes after 24 hours)
- Or contact us and we can manually verify you

### "My cart items disappeared"

Guest carts are stored in your browser. Clearing browser data removes them. Log in to permanently save your cart.

### "Payment failed"

If online payment isn't working, the site shows a friendly message. Choose **"Invoice (pay later)"** to place the order without payment, or contact the office directly.

### "The app won't install on my phone"

- **Android**: Use Chrome
- **iPhone**: Use Safari → share button → Add to Home Screen
- Must be on HTTPS

### "I forgot my password"

Click **"Forgot password?"** on the login page. Reset link valid for 1 hour.

### "Minimum X packs required"

The garment has a minimum order quantity. Increase your quantity to meet the minimum.

---

## Contact

For support, wholesale enquiries, or to place an order by phone, visit the [About page](/about) or contact the office directly.
