# Deploy B2B Fashion to Railway

Follow these steps to deploy the app to [Railway](https://railway.app).

---

## What this app includes

- **Claudia B2B** — wholesale product list, product detail, cart, and order signing (single cart per user)
- **Admin** — products CRUD, bulk Excel import, users, orders (list + detail + pick list + PDF sales order + status + payments), customer detail with order history, editable About / Footer CMS, image upload (Railway Image Service / Volume / Cloudinary), optional seed + AI model photo generation (FASHN)
- **Product images** — uploads stored as blob keys; served via signed URL proxy (`/api/images/signed` public, `/api/admin/images/signed` admin). Image Service URL never needs to be public to the browser.
- **Payments** — Stripe Checkout (hosted). Three payment options per order: pay in full / 10% deposit / invoice. Customer reused across orders via `stripeCustomerId`. Webhook-driven status (`checkout.session.completed`, `expired`, `async_payment_failed`, `charge.refunded`). Manual payment recording (cash / bank transfer / cheque / Stripe / other) closes outstanding balances.
- **Orders** — pack-based ordering with size ratios. Lifecycle: `signed → confirmed → picked → ready_to_ship → shipped → delivered`. Customer sees fulfilment progress in the cart's past-orders panel.
- **Email** — Resend handles verification + OTP + password reset + admin new-order notification

---

## 1. Push your code to GitHub

If you haven’t already:

```bash
git add .
git commit -m "Ready for Railway deploy"
git push origin main
```

(Use your default branch name if it’s not `main`.)

---

## 2. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub is easiest).
2. Click **New Project**.
3. Choose **Deploy from GitHub repo**.
4. Select your **b2bfashion** repo (or the repo that contains this code).
5. Railway will create a project and a **service** for the app. It may prompt you to configure the repo; confirm and continue.

---

## 3. Add MongoDB

**Option A – Railway MongoDB plugin**

1. In the same project, click **+ New** (or **Add service**).
2. Choose **Database** → **Add MongoDB** (or **MongoDB** from the catalog).
3. After it’s created, open the MongoDB service → **Variables** or **Connect**.
4. Copy the **connection string** (e.g. `MONGO_URL` or `MONGODB_URI`). You’ll use this in the next step.

**Option B – MongoDB Atlas**

1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Get the connection URI (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/dbname`).
3. Use this as `MONGODB_URI` in the app service.

---

## 4. Set environment variables on the app service

1. In the Railway project, open the **app service** (the one from “Deploy from GitHub repo”), not the MongoDB service.
2. Go to the **Variables** tab.
3. **Connect MongoDB to the app** so the app gets the MongoDB variables:
   - In the app service, click **Variables** → **Add variable** or **Reference**.
   - Add a **reference** to the MongoDB service’s variables (e.g. “Add variable reference” and select the MongoDB service, then choose `MONGO_URL` or `MONGO_PUBLIC_URL`).  
   **Or** copy the MongoDB connection string from the MongoDB service (`MONGO_URL` or `MONGO_PUBLIC_URL`) and add it to the app as **`MONGO_URL`** (the app reads this automatically).
4. Add these variables on the **app** service:

**Required:**

| Variable | Value | Notes |
|---|---|---|
| `MONGO_URL` or `MONGO_PUBLIC_URL` | From your MongoDB service | Reference the MongoDB service variable, or paste the connection string. The app accepts either, plus `MONGODB_URI` as a third alias. |
| `NEXTAUTH_URL` | e.g. `https://claudia-c.com` | Your app's public base URL, no trailing slash. Used in Stripe success/cancel redirects, verification + new-order emails, JSON-LD. |
| `JWT_SECRET` | Long random string | e.g. `openssl rand -base64 32`. |
| `ENCRYPTION_KEY` | 64-char hex string | AES-256-GCM key — encrypts the customer's drawn signature on each signed order. Generate with `openssl rand -hex 32`. |

**Payments — Stripe (see step 10 for full setup):**

| Variable | Value | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` or `sk_live_…` | Test mode first; switch to live after one successful end-to-end test order. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | From the dashboard webhook endpoint you'll create in step 10. |

**Email — Resend (recommended):**

| Variable | Value | Notes |
|---|---|---|
| `EMAIL_API_KEY` | Resend API key | Verification + OTP + password reset + new-order admin alert. App skips silently in dev if unset (logs payload to console). |
| `EMAIL_FROM` | Verified sender address | e.g. `orders@claudia-c.com`. |
| `ADMIN_NOTIFICATION_EMAILS` | Optional, comma-separated | Recipients for the new-order alert. Falls back to every admin user in the DB if unset. Example: `ops@claudia-c.com,manager@claudia-c.com`. |

**AI (optional):**

| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API key | Powers the chatbot + label scanner. |
| `FASHN_API_KEY` | FASHN AI key | "Generate model photos" on product edit. [app.fashn.ai/api](https://app.fashn.ai/api). |

**Image storage (optional, pick one):**

| Variable | Value | Notes |
|---|---|---|
| `IMAGE_SERVICE_URL` + `IMAGE_SERVICE_SECRET_KEY` (+ `IMAGE_SERVICE_SIGNATURE_SECRET_KEY`) | From the Image Service template | See step 9. Recommended. |
| `UPLOAD_VOLUME_PATH` | e.g. `/data` | Railway Volume fallback. |
| `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | From Cloudinary | Cloudinary fallback. |

**Other:**

| Variable | Value | Notes |
|---|---|---|
| `CLAIM_ADMIN_SECRET` | Optional secret | One-time self-elevation via `/claim-admin` (see step 8). Remove after first use. |

You do **not** need to add `MONGODB_URI` if you already set `MONGO_URL` or `MONGO_PUBLIC_URL`.

---

## 5. Deploy

1. With the app service selected, Railway usually **auto-deploys** when you push to GitHub. If not, use **Deploy** or **Redeploy** from the service.
2. **Wait for the build to finish** (e.g. “Build successful”, then “Deploy successful” or “Active”). New routes (e.g. `/claim-admin`) only appear after a deploy that includes the latest code.
3. If the build fails, check the **Build logs** for errors (e.g. missing env var, Node version).
4. **Getting 404 on a new page?** Make sure the latest commit is deployed: Railway → app service → **Deployments** → check the commit hash (e.g. `53d3531` or later for claim-admin). If the live deploy is older, click **Redeploy** or **Deploy** to build from the latest push.

---

## 6. Get your app URL and set NEXTAUTH_URL

1. Open the app service → **Settings** or **Deployments**.
2. Under **Networking** or **Public networking**, click **Generate domain** (or use the default one).
3. Copy the URL (e.g. `https://b2bfashion-production.up.railway.app`).
4. In **Variables**, set:
   - **`NEXTAUTH_URL`** = `https://b2bfashion-production.up.railway.app` (no trailing slash).
5. Trigger a **redeploy** so the app restarts with the new variable (e.g. **Redeploy** from the latest deployment).

---

## 7. Verify

1. Open the app in the browser: [https://b2bfashion-production.up.railway.app](https://b2bfashion-production.up.railway.app).
2. **Check database connection:** open [https://b2bfashion-production.up.railway.app/api/health](https://b2bfashion-production.up.railway.app/api/health). You should see `{"ok":true,"database":"connected"}`. If you see `"database":"disconnected"` and an error, the app does not have a valid `MONGO_URL` / `MONGO_PUBLIC_URL` / `MONGODB_URI` or cannot reach MongoDB — fix the variable or MongoDB service link and redeploy.
3. You should see the Claudia B2B home page.
4. Try **Register** → **Login** → **Products** → add to order → **Cart** → sign order.

---

## 8. Make yourself an admin (so you can upload/seed products)

You need an admin user to seed sample products and add products. Easiest way on Railway:

1. In the **app** service → **Variables**, add:
   - **`CLAIM_ADMIN_SECRET`** = any secret string you choose (e.g. run `openssl rand -base64 24` and paste it).
2. **Redeploy** the app so the variable is picked up.
3. **Log in** to the app (register first if you haven’t).
4. Open **https://b2bfashion-production.up.railway.app/claim-admin**.
5. Enter the same secret you set as `CLAIM_ADMIN_SECRET` and click **Claim admin**.
6. You’re now an admin. You can go to **Admin** and run **Seed sample products**, or add products via the API.
7. (Optional) Remove **`CLAIM_ADMIN_SECRET`** from Variables and redeploy so the claim page can’t be used again.

**Alternative (using MongoDB directly):** If you prefer to set admin in the database, use MongoDB Compass or `mongosh` with your Railway MongoDB **MONGO_PUBLIC_URL** connection string, connect to the database, and run:  
`db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })`.

---

## 9. Product image uploads (Railway Image Service – recommended)

To let admins **upload product photos** with on-the-fly resize and WebP/AVIF, use the **Railway Image Service** template (one place to pay, no Cloudinary).

The template uses its own variable names. You configure the **Image Service** (the template) and then tell the **app** how to reach it.

1. **Deploy the Image Service** in the same Railway project:
   - Go to [Railway Image Service template](https://railway.com/deploy/MF8Rcp) and click **Deploy Now**, or in your project click **+ New** → **Deploy from template** and search for “Image Service”.
   - After deploy, open the **Image Service** service (the one you just deployed) → **Variables**. You’ll see things like `HOST`, `RAILWAY_RUN_UID`, `SECRET_KEY`, `SIGNATURE_SECRET_KEY`. Set these two (the template may leave them empty):
     - **`SECRET_KEY`** – set to a secret string, e.g. run `openssl rand -base64 24` and paste the output. This is the API key for uploads.
     - **`SIGNATURE_SECRET_KEY`** – set to another secret string, e.g. run `openssl rand -base64 24` again. Optional but recommended (enables local URL signing).
   - In the **Image Service** → **Settings** → **Networking**, click **Generate domain** so the service gets a public URL (e.g. `https://image-service-production.up.railway.app`). Copy that URL.
2. **Connect the app to the Image Service** – open your **app** service (the b2bfashion app, not the Image Service) → **Variables**, and add:
   - **`IMAGE_SERVICE_URL`** = the Image Service public URL you copied (no trailing slash), e.g. `https://image-service-production.up.railway.app`.
   - **`IMAGE_SERVICE_SECRET_KEY`** = the **exact same value** you set as **`SECRET_KEY`** on the Image Service.
   - **`IMAGE_SERVICE_SIGNATURE_SECRET_KEY`** = the **exact same value** you set as **`SIGNATURE_SECRET_KEY`** on the Image Service (optional; if set, signed URLs are generated without an extra network call).
3. **Redeploy** the app so it picks up the new variables.

**Summary**

| Where | Variable | Value |
|-------|----------|--------|
| **Image Service** (template) | `SECRET_KEY` | Your secret (e.g. `openssl rand -base64 24`) |
| **Image Service** (template) | `SIGNATURE_SECRET_KEY` | Your secret (e.g. `openssl rand -base64 24`) |
| **App** (b2bfashion) | `IMAGE_SERVICE_URL` | Image Service public URL (from Settings → Generate domain) |
| **App** (b2bfashion) | `IMAGE_SERVICE_SECRET_KEY` | Same as Image Service `SECRET_KEY` |
| **App** (b2bfashion) | `IMAGE_SERVICE_SIGNATURE_SECRET_KEY` | Same as Image Service `SIGNATURE_SECRET_KEY` |

After this, the “Upload file” button in **Admin → Products → Add/Edit product** will upload to the Image Service. Product images are stored as blob keys; the app serves them on product list and detail pages via `/api/images/signed` (public) and in admin via `/api/admin/images/signed`, so the Image Service URL does not need to be public to the browser.

**Fallbacks (no Image Service):**  
- **Railway Volume:** Add a Volume, set its mount path to `/data`, and set **`UPLOAD_VOLUME_PATH`** = `/data` on the app. Images are stored on the volume and served at `/api/uploads/<filename>`.  
- **Cloudinary:** Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the app.  
- **Manual:** Admins can always add image URLs via “Add URL”.

---

## 10. Stripe payments (recommended)

The site uses **Stripe Checkout** (hosted page) for card payments. You don't need this until you want to take card payments — orders can still be placed as "Invoice (pay later)" without Stripe.

1. **Create / sign in** at [dashboard.stripe.com](https://dashboard.stripe.com). Leave the top-left toggle on **Test mode** until you've placed a successful test order end-to-end.
2. **Get your test secret key** — Developers → API keys → **Secret key** (`sk_test_…`). Treat it like a password.
3. **Set on the app**:
   - `STRIPE_SECRET_KEY` = `sk_test_…`
   - `NEXTAUTH_URL` = your full public URL (e.g. `https://claudia-c.com`) — required so the redirect URLs Stripe sends customers back to point at the right host.
4. **Create the webhook endpoint** — Developers → Webhooks → **Add endpoint**:
   - **URL**: `https://<your-domain>/api/webhooks/stripe` — the `/api/webhooks/stripe` suffix is critical, an earlier deploy of this app accidentally pointed at the root URL and every webhook delivery got a 405.
   - **Events to send** — exactly these four:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `checkout.session.async_payment_failed`
     - `charge.refunded`
   - Save, then click **"Reveal signing secret"** (`whsec_…`).
5. **Set the webhook secret on the app**:
   - `STRIPE_WEBHOOK_SECRET` = `whsec_…`
   - Railway auto-redeploys on variable change. Wait for it.
6. **Optional dashboard toggle** — Settings → Payments → **Currency conversion** → toggle **Off**. This removes Stripe's local-currency picker so shoppers only see GBP. The codebase already forces `currency: "gbp"` and `locale: "en-GB"`, but the dashboard toggle is needed to hide the picker.
6a. **Enable extra payment methods** — Settings → **Payment methods**: turn on **Apple Pay**, **Google Pay**, and **Klarna**. The Checkout Session doesn't restrict `payment_method_types`, so any method enabled here (and eligible for the amount/currency/country) appears automatically on the hosted page. Apple Pay needs no manual domain registration for hosted Checkout. Do this on **both** the staging and live Stripe environments.
7. **Test end to end** — place an order on the live site, choose Pay now / Pay deposit:
   - Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.
   - After paying you should land on `/checkout/result` with a success message.
   - In Stripe dashboard → Payments you should see the captured payment.
   - In your app's `/admin/orders` the order should be `confirmed` with `paymentStatus: paid` and a Payment row in the order detail.
   - If anything goes wrong, check **Stripe → Developers → Webhooks → your endpoint → Events** for the delivery status and error code.
8. **Going live** — once you're happy:
   - Activate your Stripe account (business + bank details).
   - Switch dashboard to **Live mode**.
   - Get new `sk_live_…` and create a separate live webhook (you'll get a new `whsec_…`).
   - Replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on Railway with the live values.
   - Run one tiny real-card test before opening to customers.

**Other test cards** for edge cases:

| Card | Behaviour |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Declined — insufficient funds |
| `4000 0000 0000 0002` | Declined — generic |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 3220` | 3D Secure that always fails |

Full list: [docs.stripe.com/testing#cards](https://docs.stripe.com/testing#cards).

---

## 11. Email (Resend)

Verification, OTP, password reset, and the new-order admin notification all go through Resend.

1. Create an account at [resend.com](https://resend.com).
2. Verify your sending domain (or use Resend's onboarding sender for early testing).
3. Get an API key (`re_…`).
4. Set on the app:
   - `EMAIL_API_KEY` = `re_…`
   - `EMAIL_FROM` = a verified sender, e.g. `orders@claudia-c.com`
   - `ADMIN_NOTIFICATION_EMAILS` = comma-separated recipients for the new-order alert. Optional — falls back to every admin user in the DB if unset. Example: `ops@claudia-c.com,manager@claudia-c.com`.

If `EMAIL_API_KEY` or `EMAIL_FROM` is missing the app skips sending and logs the payload to console in dev — never fails the request.

---

## Quick checklist

- [ ] Repo pushed to GitHub
- [ ] Railway project created from that repo
- [ ] MongoDB added (Railway plugin or Atlas)
- [ ] `MONGO_URL` or `MONGO_PUBLIC_URL` (or `MONGODB_URI`) set on the **app** service
- [ ] `NEXTAUTH_URL` set to the app's public URL
- [ ] `JWT_SECRET` set (`openssl rand -base64 32`)
- [ ] `ENCRYPTION_KEY` set (`openssl rand -hex 32`)
- [ ] Build and deploy successful
- [ ] App loads and login/register work
- [ ] `CLAIM_ADMIN_SECRET` set, then used at /claim-admin to become admin (optional)
- [ ] (Optional) Railway Image Service deployed; `IMAGE_SERVICE_URL` and `IMAGE_SERVICE_SECRET_KEY` set (or Volume + `UPLOAD_VOLUME_PATH`)
- [ ] (Optional) `FASHN_API_KEY` + `ANTHROPIC_API_KEY` set for AI features
- [ ] (Recommended) Stripe configured: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, webhook URL = `https://<domain>/api/webhooks/stripe`, test order placed
- [ ] (Recommended) Resend configured: `EMAIL_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAILS`

---

## Optional: Railway CLI

You can also deploy and set variables from the terminal:

```bash
# Install: npm i -g @railway/cli
railway login
railway link   # select your project + app service
railway variables set MONGO_URL="mongodb+srv://..."   # or reference from MongoDB service
railway variables set NEXTAUTH_URL="https://b2bfashion-production.up.railway.app"
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway up     # build and deploy
```

Use the same variable names and values as in the table above.

---

## Troubleshooting

### "connect ECONNREFUSED 127.0.0.1:27017" or "connect ECONNREFUSED ::1:27017"

The **app** is trying to connect to MongoDB on **localhost**. On Railway, the app and MongoDB run in **different containers**, so localhost on the app is not the database.

**Fix:**

1. Open your **app** service (not the MongoDB service) → **Variables**.
2. Ensure the app has **`MONGO_URL`** or **`MONGO_PUBLIC_URL`** set to the **MongoDB service connection string**:
   - **Option A:** In the app service, use **Variable reference** → select your **MongoDB** service → choose **`MONGO_URL`** or **`MONGO_PUBLIC_URL`**. That injects the real MongoDB URL (e.g. `mongodb://user:pass@mongodb.railway.internal:27017` or a public URL).
   - **Option B:** Open the **MongoDB** service → **Variables** or **Connect** → copy the value of **`MONGO_URL`** or **`MONGO_PUBLIC_URL`** (it should look like `mongodb://...` with a hostname, **not** `localhost`). Paste it into the **app** service as a new variable **`MONGO_URL`**.
3. If you had **`MONGODB_URI`** set to `mongodb://localhost:27017/...` (e.g. from local dev), **remove it** from the app service on Railway or overwrite it with the real MongoDB URL. The app uses `MONGO_URL` / `MONGO_PUBLIC_URL` first; if only `MONGODB_URI` is set to localhost, that causes this error.
4. **Redeploy** the app service after changing variables.

Then open [https://b2bfashion-production.up.railway.app/api/health](https://b2bfashion-production.up.railway.app/api/health) — you should see `{"ok":true,"database":"connected"}`.

### 404 on /claim-admin (or other new pages)

The live app is running an **older deployment** that doesn’t include that route. Fix:

1. In Railway → open your **app** service (not MongoDB).
2. Go to **Deployments** and check the **commit** of the latest deployment (e.g. `53d3531`).
3. If it’s older than your latest push, click **Redeploy** (or **Deploy** → deploy from `main`) so Railway builds and runs the latest code from GitHub.
4. Wait for the new deployment to finish (“Deploy successful” / “Active”), then try the URL again.

### Mongoose "Duplicate schema index" warnings

These are harmless. The codebase has been updated to remove the duplicate index definitions so these warnings no longer appear after the next deploy.

### MongoDB logs: "vm.max_map_count", "swappiness", "XFS recommended"

These are **informational** suggestions from the MongoDB container. MongoDB is still running and accepting connections. You can ignore them unless you need to tune performance.

### Build fails at `npm ci`: "Missing: @emnapi/runtime from lock file"

Vitest 4 pulls an *optional* `@rolldown/binding-wasm32-wasi` whose sub-deps (`@emnapi/runtime`, `@emnapi/core`) get omitted from the lockfile when `npm install` is run on a non-Linux host (Windows / macOS). Railway's Linux `npm ci` then refuses to install because the lockfile is "out of sync".

**Fix already applied:** `nixpacks.toml` uses `npm install --no-audit --no-fund` instead of `npm ci`. This regenerates the missing entries inside the build, never touches the repo lockfile, and unblocks the deploy. The trade-off is non-strict lockfile pinning at build time.

To restore strict `npm ci`: regenerate `package-lock.json` on Linux (WSL on Windows works) and commit it; switch the nixpacks install command back to `npm ci`.

### Stripe webhooks all returning 405 in the dashboard

The webhook URL is set to the **site root** (`https://your-domain.com`) instead of the webhook path. The root URL only accepts GET, so every POST from Stripe 405s.

**Fix:** in Stripe dashboard → Developers → Webhooks → edit your endpoint → set URL to `https://your-domain.com/api/webhooks/stripe`. The `/api/webhooks/stripe` suffix is the actual route handler.

### Customer says billing country defaults to "United States" on Stripe Checkout

`locale: "en-GB"` only sets the UI **language**, not the country dropdown default. The code pre-creates a Stripe Customer with `address.country: "GB"` so the dropdown opens on UK. If you see US, either the change isn't deployed (check the latest commit on Railway) or your shopper has a saved Stripe wallet that overrides the default — in either case the customer can still pick UK manually.
