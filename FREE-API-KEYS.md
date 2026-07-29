# Free API keys — step-by-step for Patriotic Youths of Uganda

Live app: **https://patriotic-app.onrender.com**

Maps on this site use **OpenStreetMap** — **no map API key required**.

---

## Your current status (checked live)

| Service | Status | Env var |
|--------|--------|---------|
| Postgres | ✅ Live (`backend: postgres`) | `DATABASE_URL` on Render |
| PawaPay | ✅ Live (`ready: true`, token set) | `PAWAPAY_API_TOKEN` |
| Square cards | ✅ Live (`webPaymentsReady`, `chargeReady`) | Square keys on Render |
| Google Client ID | ✅ In `render.yaml` / local env | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| Cloudinary images | ⬜ Usually not set — do this next | `CLOUDINARY_*` |
| Google Analytics | ⬜ Optional | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |

Local `.env.local` also already has PawaPay, MoMo sandbox, Airtel, Square, and Google values.

---

## A. Google Sign-In (free) — verify it works

### 1. Open Google Cloud
https://console.cloud.google.com/apis/credentials

Sign in with the Google account that owns the OAuth client  
(your Client ID starts with `868445110488-…`).

### 2. Open the Web client
Click the **OAuth 2.0 Client ID** of type **Web application**.

### 3. Authorized JavaScript origins (exact, no trailing slash)

```text
http://localhost:3000
https://patriotic-app.onrender.com
```

If you add a custom domain later, add `https://your-domain.com` too.

### 4. Authorized redirect URIs

```text
http://localhost:3000/auth/callback/google
https://patriotic-app.onrender.com/auth/callback/google
```

### 5. OAuth consent screen
https://console.cloud.google.com/apis/credentials/consent  

- User type: **External** is fine  
- App name: Patriotic Youths of Uganda  
- Support email: your email  
- Publishing status: **Testing** is OK while you test (add test users)  
- For public users: click **Publish app** (Google may ask for verification only if you request sensitive scopes — basic sign-in usually stays simple)

### 6. Env (already set if you used the project defaults)

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=868445110488-….apps.googleusercontent.com
NEXT_PUBLIC_APP_URL=https://patriotic-app.onrender.com
```

### 7. Test
1. Open https://patriotic-app.onrender.com/auth/login  
2. **Continue with Google**  
3. Pick a Gmail account → should land in dashboard / register  

**If blocked:** “Access blocked” → add your Gmail under Consent screen → Test users, or publish the app.

---

## B. Postgres / Neon (free) — already working live

Live health: https://patriotic-app.onrender.com/api/system/db-health  

You should see `"backend":"postgres"`. **No action needed** unless you want a new DB.

### If you ever need a new free DB (Neon)

1. https://neon.tech → Sign up (GitHub login is fine)  
2. Create project → region close to Europe if Render is Frankfurt  
3. **Dashboard → Connection string** → copy URI  
   Example shape:  
   `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`  
4. Render → **patriotic-app** → **Environment** → add/update:

```env
DATABASE_URL=postgresql://...
```

5. **Manual Deploy** → Clear build cache & deploy  
6. Recheck `/api/system/db-health`

Local optional: put the same `DATABASE_URL` in `.env.local` so laptop and live share data (careful with production data).

---

## C. Cloudinary (free) — permanent images (recommended next)

Without Cloudinary, uploads on free Render can disappear after redeploy.

### 1. Sign up
https://cloudinary.com/users/register/free  

### 2. Copy Cloud name
Dashboard home → **Cloud name** (e.g. `dxxxxx`)

### 3. Create unsigned upload preset
1. **Settings** (gear) → **Upload**  
2. **Upload presets** → **Add upload preset**  
3. **Signing mode**: **Unsigned**  
4. **Folder** (optional): `pyu`  
5. Save → copy preset name (e.g. `pyu_unsigned`)

### 4. (Optional) API Key + Secret
Settings → **API Keys** → copy **API Key** and **API Secret**  
(Not required if you only use unsigned browser uploads.)

### 5. Add to Render Environment

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=pyu_unsigned
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=pyu_unsigned
# optional:
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
```

### 6. Same lines in local `.env.local` (for dev)

### 7. Redeploy Render, then test
Super Admin → Media / site logo upload → image URL should start with `https://res.cloudinary.com/...`

---

## D. PawaPay (sandbox free / live merchant)

### Live status
https://patriotic-app.onrender.com/api/payments/pawapay/config  

You already have `"ready":true,"hasToken":true`.

### Get / rotate a free **sandbox** token (testing only)

1. https://dashboard.sandbox.pawapay.io  
2. Sign up / log in  
3. **Developers → API tokens** → create token  
4. **System → Callback URL** set to:

```text
https://patriotic-app.onrender.com/api/payments/pawapay/callback
```

5. Env for **sandbox testing**:

```env
PAWAPAY_API_TOKEN=your_sandbox_token
PAWAPAY_ENV=sandbox
NEXT_PUBLIC_PAWAPAY_ENV=sandbox
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io
```

### Live money (not free forever — merchant account)

1. https://dashboard.pawapay.io (production)  
2. Complete KYC / merchant onboarding  
3. Create **live** API token  
4. Same callback URL as above  
5. Env:

```env
PAWAPAY_API_TOKEN=your_live_token
PAWAPAY_ENV=production
NEXT_PUBLIC_PAWAPAY_ENV=production
PAWAPAY_BASE_URL=https://api.pawapay.io
```

**Never commit tokens to GitHub.** Only Render Environment / local `.env.local`.

---

## E. Square (sandbox free) — cards

Sandbox console: https://developer.squareup.com/console  

1. Create app → **Credentials** → **Sandbox**  
2. Copy:
   - Application ID → `NEXT_PUBLIC_SQUARE_APPLICATION_ID`  
   - Access token → `SQUARE_ACCESS_TOKEN`  
   - Location ID → `NEXT_PUBLIC_SQUARE_LOCATION_ID` + `SQUARE_LOCATION_ID`  
3. Set:

```env
SQUARE_ENV=sandbox
NEXT_PUBLIC_SQUARE_ENV=sandbox
```

Live already reports Square ready in production — only change if you want pure sandbox.

---

## F. MTN MoMo Collections sandbox (free)

Portal: https://momodeveloper.mtn.com  

1. Sign up → Subscribe to **Collections**  
2. Copy **Primary subscription key**  
3. Create API user + key (or run):

```bash
npm run momo:setup -- YOUR_COLLECTIONS_SUBSCRIPTION_KEY
```

4. Put `MOMO_*` values in `.env.local`  

You already have sandbox-looking MoMo values in `.env.local`.

---

## G. Google Analytics (optional, free)

1. https://analytics.google.com → Create account/property  
2. Data stream → Web → URL `https://patriotic-app.onrender.com`  
3. Copy Measurement ID `G-XXXXXXXX`  
4. Render + `.env.local`:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

5. Redeploy — scripts only load when this is set.

---

## Where to paste keys on Render

1. https://dashboard.render.com  
2. Service **patriotic-app** → **Environment**  
3. **Add Environment Variable** for each key  
4. **Save** → **Manual Deploy** → “Clear build cache & deploy” if public `NEXT_PUBLIC_*` values changed  

Public vars (`NEXT_PUBLIC_*`) are baked into the client at **build** time — always redeploy after changing them.

---

## Security rules

- Never put secrets in chat, GitHub, or screenshots of production tokens  
- `.env.local` stays on your PC only (gitignored)  
- Prefer rotating any token that was ever committed or shared  
- Super Admin passwords: change defaults in production  

---

## Fast checklist (do in order)

1. [ ] Google: origins + redirects + test login  
2. [x] Postgres: already live  
3. [ ] Cloudinary: free account + preset + Render env + redeploy  
4. [x] PawaPay live token: already ready (confirm callbacks in PawaPay dashboard)  
5. [ ] Optional: GA Measurement ID  
6. [ ] Optional: custom domain → update Google origins + `NEXT_PUBLIC_APP_URL` + PawaPay callbacks  

---

## Helpful links (bookmark)

| Service | Link |
|---------|------|
| Google credentials | https://console.cloud.google.com/apis/credentials |
| Neon Postgres | https://neon.tech |
| Cloudinary | https://cloudinary.com/users/register/free |
| PawaPay sandbox | https://dashboard.sandbox.pawapay.io |
| PawaPay live | https://dashboard.pawapay.io |
| Square | https://developer.squareup.com/console |
| MTN MoMo | https://momodeveloper.mtn.com |
| Render dashboard | https://dashboard.render.com |
| Live db health | https://patriotic-app.onrender.com/api/system/db-health |
| Live PawaPay config | https://patriotic-app.onrender.com/api/payments/pawapay/config |
| Super Admin ops | https://patriotic-app.onrender.com/super-admin/ops |
