# Claudia B2B — User Guide

Welcome to Claudia B2B, your wholesale platform for ladies fashion. This guide covers everything you need to know as a customer or admin.

---

## For Customers

### Getting Started

#### Browsing Garments
1. Visit the website — no account needed to browse
2. Click **"Garments"** in the navigation bar to see the full catalogue
3. Use the filters to narrow down by:
   - **Stock type**: Current season, Previous year
   - **Category**: Tops, Dresses, Knitwear, Skirts, Jackets, etc.
   - **Colour**: Filter by available colours
4. Use the **search bar** to find garments by name, SKU, or style number
5. Click any garment to see full details, multiple photos, sizes, materials, and care instructions

#### Using the Chatbot
- Click the **black chat icon** in the bottom-right corner of any page
- Ask about garments, styles, colours, sizing, materials, or how the website works
- The chatbot knows our full catalogue and can help you find what you're looking for
- Example questions:
  - "What dresses do you have in black?"
  - "Do you have any knitwear in size M?"
  - "How does the ordering process work?"
  - "What payment options do you have?"

### Adding to Cart

1. Open any garment and select your **size** (if the garment has sizes)
2. Set the **quantity** — must be a multiple of the pack size (shown on the page)
3. Click **"Add to Order"**
4. A green confirmation message appears — click **"View Cart"** to see your items
5. You can add items from multiple garments before checking out
6. **No account needed** to add to cart — your items are saved in your browser

### Viewing Your Cart

- Click the **bag icon** in the navigation bar (the badge shows your item count)
- Review your items with thumbnails, quantities, and details
- **Edit quantities** — change the number (must be a multiple of pack size)
- **Remove items** — click "Remove" next to any item

### Creating an Account

To place an order, you need a wholesale account:

1. Click **"Log in"** in the navbar, then **"Create an account"**
2. Enter your email, password (must include uppercase, lowercase, and a number), name, and company name
3. Optionally write a message about your business in the application field
4. Click **Register**
5. Log in with your email and password

**Note:** Prices are not visible until your account is approved for wholesale access by our team.

### Checking Out

1. Go to your **Cart** and click **"Proceed to Checkout"**
2. Fill in your **delivery address** (address, city, postcode, country)
3. Optionally add your **company name** and **VAT number**
4. Choose your **payment method**:

| Option | What happens |
|--------|-------------|
| **Pay in full** | Pay the entire order total now by card (via Worldpay) |
| **Pay 10% deposit** | Pay 10% now by card, remaining 90% due on delivery |
| **Invoice (pay later)** | Order confirms immediately, invoice sent, pay on delivery |

5. **Sign** your order by drawing your signature in the signature box (works with mouse or finger on mobile)
6. Click the payment button — you'll be redirected to Worldpay for card payments, or see a confirmation for invoice orders

### After Ordering

- View your **past orders** on the Cart page
- Each order shows its status: Pending, Signed, Confirmed
- For card payments, you'll see a confirmation page with your payment details

### Installing the App on Your Phone

On mobile, a banner will appear: **"Add Claudia to your home screen"**

- **Android**: Tap **"Install"** — the app installs like a native app
- **iPhone**: Tap the **share button** (square with arrow), then **"Add to Home Screen"**

The app will appear on your home screen with the Claudia icon for quick access.

---

## For Admins

### Accessing the Admin Panel

1. Log in with an admin account
2. Click **"Admin"** in the navigation bar
3. The admin panel is at `/admin`

### Adding a New Garment

1. Go to **Admin > Products > New product**
2. **Quick actions at the top of the form:**

#### Scan Care Labels (AI)
- Click **"Take Photo"** to photograph a garment label with your phone camera
- Take photos of all labels (materials, care symbols, sizes, price tags)
- Click **"Add Another"** for each additional label
- See thumbnails of all queued photos
- Click **"Scan N Labels"** — Claude AI reads all photos and auto-fills:
  - Materials (e.g. "95% Polyester, 5% Elastane")
  - Care instructions (translates washing/ironing symbols into English)
  - Sizes, colour, SKU, product code, product name, price
- Review and edit the auto-filled fields before saving

#### Upload Product Photos
- Click **"Upload Product Photos"** to add garment images
- Select multiple files at once (front, back, details)
- Photos appear in the image grid below

### Managing Product Images

- **Drag to reorder** — drag images to change their position. Image 1 is the main photo used on the homepage and product listings
- **Numbered badges** — each image shows its position (1, 2, 3...)
- **Arrow buttons** — hover to see left/right arrows for mobile reordering
- **Remove** — hover and click the red X to delete an image

### Generating AI Model Photos

1. Upload at least one garment photo
2. **Save the product first** (click "Save changes")
3. Hover any image and click **"AI Generate"**
4. Select **Front** or **Back** to tell the AI which side of the garment the photo shows
5. Optionally add a styling prompt (or click a quick-select example):
   - Studio, heels, minimal
   - Autumn, boots
   - Outdoor casual
   - Elegant indoor
   - White backdrop
   - City street
6. Choose how many photos to generate (1-4)
7. Click **"Generate"** — wait 1-2 minutes
8. Generated model photos appear in the image grid automatically

**Default settings:** All generated photos feature women aged 35-55 with diverse ethnicities. You only need to describe the styling/background.

### Featuring Garments on the Homepage

Each garment has **three checkboxes** for homepage visibility:

| Checkbox | Section | What it shows |
|----------|---------|---------------|
| **Front Page** | Hero banner + two-column feature | First 3 products fill the big hero area |
| **Featured Styles** | Product grid below the hero | Up to 8 products in a 4-column grid with hover image swap |
| **Our Latest Looks** | Rotating gallery | Each card cycles through all the product's photos with crossfade |

A garment can appear in any combination of sections, or none.

### Managing Users

Go to **Admin > Manage users** to:

- **Allow pricing** — toggle whether a user sees wholesale prices
- **View forward stock** — toggle access to upcoming collections
- **View current/previous stock** — control stock section visibility
- **Change roles** — promote/demote users

### Product Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| SKU | Yes | Unique stock keeping unit |
| Product code | No | Style number or model code |
| Name | Yes | Garment name |
| Short description | No | Brief description |
| Long description | No | Detailed description |
| Materials | No | Fabric composition (auto-filled by label scanner) |
| Care guide | No | Care instructions (auto-filled by label scanner) |
| Category | Yes | Tops, Dresses, Knitwear, etc. |
| Stock section | Yes | Current, Previous, or Forward |
| Primary colour | Yes | Main colour |
| Colour options | No | Comma-separated list of available colours |
| Sizes | No | One per line or comma-separated |
| Images | No | Upload or add by URL |
| Featured / Front Page / Latest Looks | No | Homepage visibility checkboxes |
| Pack size | Yes | Minimum order quantity (e.g. 6) |
| Price per item | No | Wholesale price in GBP |
| Compare at price | No | Original price (shown with strikethrough) |

---

## Troubleshooting

### "Why can't I see prices?"
Prices are only visible to approved wholesale accounts. Register, then wait for admin approval. Contact the office if you need faster access.

### "My cart items disappeared"
If you were browsing without logging in, your items are stored in your browser. Clearing browser data removes them. Log in to permanently save your cart.

### "Payment failed"
If online payment isn't working, the message will suggest contacting the office. You can also choose "Invoice (pay later)" to place your order without immediate payment.

### "The app won't install on my phone"
- **Android**: Use Chrome browser. The install banner appears automatically.
- **iPhone**: Use Safari. Tap the share button, then "Add to Home Screen".
- Make sure you're on the HTTPS version of the site.

### "I forgot my password"
Click "Forgot password?" on the login page. Enter your email and we'll send a reset link (valid for 1 hour).

---

## Contact

For support, wholesale enquiries, or to place an order by phone, visit our [About page](/about) or contact the office directly.
