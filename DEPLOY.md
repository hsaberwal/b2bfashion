# Deploy B2B Fashion to Railway

Follow these steps to deploy the app to [Railway](https://railway.app).

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

| Variable | Value | Notes |
|----------|--------|--------|
| `MONGO_URL` or `MONGO_PUBLIC_URL` | From your MongoDB service | Reference the MongoDB service variable, or paste the connection string. The app uses either one. |
| `NEXTAUTH_URL` | `https://b2bfashion-production.up.railway.app` | Your app’s Railway URL (no trailing slash). |
| `JWT_SECRET` | Long random string | e.g. run `openssl rand -base64 32` and paste the output. |
| `IMAGE_SERVICE_URL` | (Optional) Railway Image Service public URL | e.g. `https://image-service-production.up.railway.app`. See **Step 9**. |
| `IMAGE_SERVICE_SECRET_KEY` | (Optional) Same as Image Service `SECRET_KEY` | For admin uploads to Image Service. |
| `IMAGE_SERVICE_SIGNATURE_SECRET_KEY` | (Optional) Same as Image Service `SIGNATURE_SECRET_KEY` | For local URL signing. |
| `UPLOAD_VOLUME_PATH` | (Optional) Mount path of a Railway Volume | e.g. `/data`. Fallback if Image Service not set. |
| `FASHN_API_KEY` | (Optional) FASHN AI API key | For “Generate model photos” on product edit. Get from [app.fashn.ai/api](https://app.fashn.ai/api). |

You do **not** need to add `MONGODB_URI` if you already set `MONGO_URL` or `MONGO_PUBLIC_URL` (e.g. from Railway’s MongoDB plugin).

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

After this, the “Upload file” button in **Admin → Products → Add/Edit product** will upload to the Image Service. Product and list pages will receive signed, resized image URLs automatically.

**Fallbacks (no Image Service):**  
- **Railway Volume:** Add a Volume, set its mount path to `/data`, and set **`UPLOAD_VOLUME_PATH`** = `/data` on the app. Images are stored on the volume and served at `/api/uploads/<filename>`.  
- **Cloudinary:** Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the app.  
- **Manual:** Admins can always add image URLs via “Add URL”.

---

## Quick checklist

- [ ] Repo pushed to GitHub  
- [ ] Railway project created from that repo  
- [ ] MongoDB added (Railway plugin or Atlas)  
- [ ] `MONGO_URL` or `MONGO_PUBLIC_URL` (or `MONGODB_URI`) set on the **app** service  
- [ ] `NEXTAUTH_URL` set to the app’s Railway URL (after first deploy)  
- [ ] `JWT_SECRET` set  
- [ ] Build and deploy successful  
- [ ] App loads and login/register work  
- [ ] `CLAIM_ADMIN_SECRET` set, then used at /claim-admin to become admin (optional)  
- [ ] (Optional) Railway Image Service deployed; `IMAGE_SERVICE_URL` and `IMAGE_SERVICE_SECRET_KEY` set (or Volume + `UPLOAD_VOLUME_PATH`)  

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
