# Just Elegance B2B — Sales Platform

B2B wholesale platform for **Just Elegance** ([justelegance.com](https://www.justelegance.com/)) — ladies fashion wear. Built with **Next.js**, **Node.js** (API routes), and **MongoDB**. Deploy on **Railway**.

## Features

- **Stock sections**: Previous year stock, Current stock, Forward/upcoming stock (password protected)
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
- **FORWARD_STOCK_PASSWORD** — Password required to view Forward/upcoming stock
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
- Browse products at `/products`. Use the Forward stock password in the sidebar to view upcoming stock
- Pricing stays hidden until `pricingApproved` is set on your user in the database (e.g. via MongoDB Compass or a future admin API)
- Add products to an order (quantity must be a multiple of pack size), then go to Cart and sign the order

## Deploy to Railway

1. Push this repo to GitHub and connect the repo in [Railway](https://railway.app).
2. Create a **MongoDB** service (Railway add-on or external Atlas) and give the app access to **MONGO_URL** or **MONGO_PUBLIC_URL** (reference the MongoDB service variables, or copy the connection string).
3. In the app service, set:
   - **MONGO_URL** or **MONGO_PUBLIC_URL** — from the MongoDB service (or use **MONGODB_URI** with the connection string)
   - **NEXTAUTH_URL** — `https://your-app.up.railway.app`
   - **FORWARD_STOCK_PASSWORD** — your chosen password for forward stock
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

## Granting pricing access

Users have a `pricingApproved` flag. Until you build an admin UI, set it manually in MongoDB, e.g.:

```javascript
db.users.updateOne(
  { email: "customer@example.com" },
  { $set: { pricingApproved: true } }
)
```

## Tech stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API routes (Node.js)
- **Database**: MongoDB with Mongoose
- **Hosting**: Railway (or any Node host)
