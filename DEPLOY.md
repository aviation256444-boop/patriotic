# Deploy to Render (permanent public URL)

GitHub (deploy source): https://github.com/aviation256444-boop/patriotic

Live app: **https://patriotic-app.onrender.com**

## Blueprint / one-click

1. Open (logged into Render linked to **aviation256444-boop** GitHub):

   **https://render.com/deploy?repo=https://github.com/aviation256444-boop/patriotic**

2. Apply / create the Blueprint (`render.yaml` → service **patriotic-app**).
3. After the service exists, open **Environment** and set secrets:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | **Postgres connection string** (Neon free / Supabase / Render Postgres) — keeps users, donations, CMS after redeploy. See **DATABASE.md** |
| `PAWAPAY_API_TOKEN` | Your **live** PawaPay token |
| `NEXT_PUBLIC_APP_URL` | `https://patriotic-app.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` *(optional)* | Permanent logo/image hosting |
| `CLOUDINARY_UPLOAD_PRESET` *(optional)* | Unsigned upload preset |

After deploy, check: `https://patriotic-app.onrender.com/api/system/db-health` → should show `"backend":"postgres"`.

Other PawaPay / app vars are already in `render.yaml`.

4. **Manual Deploy** → Clear build cache & deploy (if auto-deploy fails).
5. Wait until status is **Live** (5–15 min on free tier). First cold start can take 30–60s.

## Public links

```text
https://patriotic-app.onrender.com
https://patriotic-app.onrender.com/donate
https://patriotic-app.onrender.com/events
https://patriotic-app.onrender.com/admin/payments
```

## PawaPay live callbacks

```text
https://patriotic-app.onrender.com/api/payments/pawapay/callback
```

Paste that URL for Deposits (and other callback fields) in the **live** PawaPay dashboard.

## Event tickets & membership

After a successful deploy you should have:

- `GET/POST /api/events/tickets` — paid seats only after confirmed payment
- `GET /api/events/tickets?stats=1` — admin payments dashboard
- `GET /api/membership/verify?q=...` — membership card verify
- `/tickets/[id]` — e-receipt page

## Free tier notes

- App may sleep when idle; first visit can take 30–60 seconds to wake.
- Uploaded files under `/public/uploads` are **ephemeral** unless you use Cloudinary or data-URL logos in site settings.
- `data/tickets.json` and CMS DB are local disk on the free instance (reset on major redeploy/disk wipe).

## Google Gmail sign-in (account picker)

Users tap **Continue with Google** → Google lists every Gmail account on the device → they pick one → login or auto-register.

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create OAuth client ID** → type **Web application**
3. **Authorized JavaScript origins**
   - `http://localhost:3000`
   - `https://patriotic-app.onrender.com`
4. **Authorized redirect URIs**
   - `http://localhost:3000/auth/callback/google`
   - `https://patriotic-app.onrender.com/auth/callback/google`
5. Add to Render Environment + local `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
NEXT_PUBLIC_APP_URL=https://patriotic-app.onrender.com
```

6. Redeploy. Without this Client ID, the Google button cannot show real Gmail accounts (Google requires it).

## Professional launch checklist

Public pages added for trust & SEO:

- `/privacy` · `/terms` · `/accessibility`
- `/impact` · `/governance` · `/faq` · `/careers` · `/press`
- `/sitemap.xml` · `/robots.txt`
- Super Admin → **Ops checklist** (`/super-admin/ops`)

Optional analytics (no scripts load unless set):

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
# or
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

### Custom domain

1. Add domain on Render → point DNS.
2. Set `NEXT_PUBLIC_APP_URL=https://your-domain`.
3. Update Google OAuth origins/redirects.
4. Update PawaPay callback URLs to `https://your-domain/api/payments/pawapay/callback`.

### Production safety

- Keep `PAYMENT_DEMO_MODE` / `DEMO_MODE` **unset or false** in production.
- `/setup/pawapay` is Super Admin–only in production (not public nav).
- Prefer real CMS content (photos, accurate stats) over placeholders.

