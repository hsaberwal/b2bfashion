# Just Elegance B2B — Sales Platform

B2B wholesale platform for **Just Elegance** ([justelegance.com](https://www.justelegance.com/)) — ladies fashion wear. Built with **Next.js**, **Node.js** (API routes), and **MongoDB**. Deploy on **Railway**.

## Features

- **Stock sections**: Previous year stock, Current stock, Forward/upcoming stock (per-user permission)
- **Product listing**: SKU, barcode, style number, categories (Tops, Blouses, T-shirts, Knitwear, Trousers, Dresses, Skirts, Jackets, Sale, etc.), colour and attribute filters, 4+ images per product
- **Pricing**: Visible only after account approval
- **Auth**: Email/password login, email OTP verification, password reset
- **Orders**: Bulk ordering only (pack sizes; pricing per single item). Digital signature for order acceptance
- **Screenshot protection**: Sensitive pricing areas use `user-select: none` (CSS)
- **PWA**: Installable on phones, tablets, and laptops — add to home screen / install as app

## Progressive Web App (PWA)

The app is a PWA so users can install it on phones, tablets, and laptops:

- **Install**: On supported browsers (Chrome, Edge, Safari), use “Add to Home Screen” or “Install app”.
- **Manifest**: `public/manifest.webmanifest` — name, theme, start URL, display `standalone`.
- **Service worker**: `public/sw.js` — enables install and caches static assets for faster loads.
- **Icon**: `public/icon.svg` is used for the app icon. For best support on all devices (especially Android), add PNG icons:
  - `public/icons/icon-192.png` (192×192)
  - `public/icons/icon-512.png` (512×512)
  Then add them to `public/manifest.webmanifest` in the `icons` array.

The app must be served over **HTTPS** for install to work (Railway provides this).

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and set:

```bash
cp .env.example .env
```

Edit `.env`:

- **MONGODB_URI** — e.g. `mongodb://localhost:27017/b2bfashion` (local). On Railway, the app also accepts **MONGO_URL** or **MONGO_PUBLIC_URL** from the MongoDB plugin.
- **JWT_SECRET** — Random string for session signing (e.g. `openssl rand -base64 32`)
- **NEXTAUTH_URL** — `http://localhost:3000` for local

### 3. Run MongoDB locally (if not using Atlas)

With Docker:

```bash
docker run -d -p 27017:27017 --name mongo mongo:latest
```

Or install MongoDB locally and start the service.

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Create a user and test

- Register at `/register`
- Log in at `/login` (password or OTP; in dev, OTP is logged in the terminal)
- Browse products at `/products`. Forward/upcoming stock is visible only if an admin grants you “View forward stock” in **Admin → Manage users**.
- Pricing is visible only after an admin enables “Allow pricing” for your user in **Admin → Manage users**.
- Add products to an order (quantity must be a multiple of pack size), then go to Cart and sign the order

## Deploy to Railway

1. Push this repo to GitHub and connect the repo in [Railway](https://railway.app).
2. Create a **MongoDB** service (Railway add-on or external Atlas) and give the app access to **MONGO_URL** or **MONGO_PUBLIC_URL** (reference the MongoDB service variables, or copy the connection string).
3. In the app service, set:
   - **MONGO_URL** or **MONGO_PUBLIC_URL** — from the MongoDB service (or use **MONGODB_URI** with the connection string)
   - **NEXTAUTH_URL** — `https://your-app.up.railway.app`
   - **JWT_SECRET** — a long random string
4. Deploy. Railway will run `npm run build` and `npm run start`.

## Project structure

- `src/app/` — Next.js App Router pages and API routes
- `src/lib/` — MongoDB connection, auth helpers, types
- `src/models/` — Mongoose models (User, Session, Product, Order)
- `public/manifest.webmanifest` — PWA manifest
- `public/sw.js` — Service worker
- `public/icon.svg` — App icon (PWA)
- `.env.example` — Example env vars for local and Railway

## Granting pricing and forward stock access

Admins can manage user permissions at **Admin → Manage users**:

- **Allow pricing** — toggles whether the user sees prices on products and in the cart.
- **View forward stock** — toggles whether the user can see the “Forward / upcoming stock” section (admins always see it).

You can also set `pricingApproved` and `canViewForwardStock` manually in MongoDB if needed.

## Admins and uploading products

**Who can upload products?** Only users with **role: "admin"**.

### Making a user an admin

Set the user’s `role` in MongoDB (e.g. MongoDB Compass, Atlas UI, or `mongosh`):

```javascript
db.users.updateOne(
  { email: "admin@yourcompany.com" },
  { $set: { role: "admin" } }
)
```

After that, when that user logs in they will see an **Admin** link (e.g. on the Products page) and can open **/admin**.

### What admins can do

- **Seed sample products** — On the Admin page, click “Seed sample products” to add placeholder products (with placeholder images) so you can see the product list and filters. Safe to run more than once.
- **Add products via API** — `POST /api/admin/products` with a JSON body (must be logged in as admin). Fields: `sku`, `name`, `category`, `stockCategory`, `colour`, `packSize`; optional: `barcode`, `styleNumber`, `description`, `images` (array of image URLs), `pricePerItem`.
- **Use images from your existing site** — When creating a product via the API, set `images` to an array of image URLs (e.g. from [Just Elegance](https://www.justelegance.com/) or your own CDN). Ensure you have the right to use those URLs in this app.

### Replacing seed images with your own

The seed uses placeholder image URLs. To use real product images (e.g. from Just Elegance):

1. Create products via `POST /api/admin/products` with `images` set to your image URLs, or  
2. In MongoDB, update existing products’ `images` array with the correct URLs.

## Tech stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API routes (Node.js)
- **Database**: MongoDB with Mongoose
- **Hosting**: Railway (or any Node host)
