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
| `NEXTAUTH_URL` | `https://<your-app>.up.railway.app` | Your app’s Railway URL (see step 6). Set after first deploy. |
| `FORWARD_STOCK_PASSWORD` | A strong password you choose | Used to view “Forward / upcoming stock” on the site. |
| `JWT_SECRET` | Long random string | e.g. run `openssl rand -base64 32` and paste the output. |

You do **not** need to add `MONGODB_URI` if you already set `MONGO_URL` or `MONGO_PUBLIC_URL` (e.g. from Railway’s MongoDB plugin).

---

## 5. Deploy

1. With the app service selected, Railway usually **auto-deploys** when you connected the repo. If not, use **Deploy** or **Redeploy** from the service.
2. Wait for the build to finish (e.g. “Build successful”, then “Deploy successful” or “Active”).
3. If the build fails, check the **Build logs** for errors (e.g. missing env var, Node version).

---

## 6. Get your app URL and set NEXTAUTH_URL

1. Open the app service → **Settings** or **Deployments**.
2. Under **Networking** or **Public networking**, click **Generate domain** (or use the default one).
3. Copy the URL (e.g. `https://b2bfashion-production-xxxx.up.railway.app`).
4. In **Variables**, set:
   - **`NEXTAUTH_URL`** = that URL (e.g. `https://b2bfashion-production-xxxx.up.railway.app`).
5. Trigger a **redeploy** so the app restarts with the new variable (e.g. **Redeploy** from the latest deployment).

---

## 7. Verify

1. Open **NEXTAUTH_URL** in the browser (e.g. `https://your-app.up.railway.app`).
2. **Check database connection:** open `https://your-app.up.railway.app/api/health`. You should see `{"ok":true,"database":"connected"}`. If you see `"database":"disconnected"` and an error, the app does not have a valid `MONGO_URL` / `MONGO_PUBLIC_URL` / `MONGODB_URI` or cannot reach MongoDB — fix the variable or MongoDB service link and redeploy.
3. You should see the Just Elegance B2B home page.
4. Try **Register** → **Login** → **Products** → add to order → **Cart** → sign order.

---

## Quick checklist

- [ ] Repo pushed to GitHub  
- [ ] Railway project created from that repo  
- [ ] MongoDB added (Railway plugin or Atlas)  
- [ ] `MONGO_URL` or `MONGO_PUBLIC_URL` (or `MONGODB_URI`) set on the **app** service  
- [ ] `NEXTAUTH_URL` set to the app’s Railway URL (after first deploy)  
- [ ] `FORWARD_STOCK_PASSWORD` and `JWT_SECRET` set  
- [ ] Build and deploy successful  
- [ ] App loads and login/register work  

---

## Optional: Railway CLI

You can also deploy and set variables from the terminal:

```bash
# Install: npm i -g @railway/cli
railway login
railway link   # select your project + app service
railway variables set MONGO_URL="mongodb+srv://..."   # or reference from MongoDB service
railway variables set NEXTAUTH_URL="https://your-app.up.railway.app"
railway variables set FORWARD_STOCK_PASSWORD="your-password"
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway up     # build and deploy
```

Use the same variable names and values as in the table above.
