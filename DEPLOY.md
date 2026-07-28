# Permanent hosting (no Cloudflare tunnel)

## Your public site

After deploy (Render free):

**https://patriotic-youths-uganda.onrender.com**

(Exact URL appears in the Render dashboard.)

## PawaPay live callbacks (permanent)

Paste this on the **live** PawaPay dashboard for all callback fields:

```text
https://patriotic-youths-uganda.onrender.com/api/payments/pawapay/callback
```

Also set in Render environment:

```text
NEXT_PUBLIC_APP_URL=https://patriotic-youths-uganda.onrender.com
```

## One-time setup on Render

1. Go to https://dashboard.render.com → New → Blueprint  
   **or** New → Web Service → connect GitHub repo  
   `Dannyparasite256/patriotic-youths-uganda`
2. Branch: `main`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Add environment variables (see below)
6. Deploy

### Required secrets (Environment)

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-SERVICE.onrender.com` |
| `PAWAPAY_API_TOKEN` | Your **live** PawaPay API token |
| `PAWAPAY_ENV` | `production` |
| `PAWAPAY_BASE_URL` | `https://api.pawapay.io` |
| `NEXT_PUBLIC_PAWAPAY_ENABLED` | `true` |
| Square keys | Same as local production if you use cards |

## Free tier note

Render free services **sleep after ~15 minutes** of no traffic. First visit may take 30–60s to wake. Payments still work after wake.

## Local vs production

| | Local | Production |
|--|--------|------------|
| URL | localhost:3000 | `*.onrender.com` |
| Tunnel | Not needed | Not needed |
| Callbacks | Optional (polling works) | Use permanent callback URL |
