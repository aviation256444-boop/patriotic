# Permanent public hosting (no Cloudflare)

Code is on GitHub:  
https://github.com/Dannyparasite256/patriotic-youths-uganda

## Fastest: one-click Render deploy

1. Open this link (logged into Render with your GitHub account):

   **https://render.com/deploy?repo=https://github.com/Dannyparasite256/patriotic-youths-uganda**

2. Click **Apply** / create the Blueprint service.
3. When the service is created, open **Environment** and set:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_APP_URL` | `https://patriotic-youths-uganda.onrender.com` *(use the exact URL Render shows)* |
| `PAWAPAY_API_TOKEN` | Your **live** PawaPay API token |
| `PAWAPAY_ENV` | `production` |
| `PAWAPAY_BASE_URL` | `https://api.pawapay.io` |
| `NEXT_PUBLIC_PAWAPAY_ENABLED` | `true` |
| `NEXT_PUBLIC_PAWAPAY_ENV` | `production` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |
| Square keys (optional) | Same production values as local if you use cards |

4. **Manual Deploy** → clear build cache & deploy.
5. Wait until status is **Live**.

### Your permanent link (example)

```text
https://patriotic-youths-uganda.onrender.com
https://patriotic-youths-uganda.onrender.com/donate
```

*(If Render assigns a slightly different name, use the URL on the service page.)*

## PawaPay live callbacks (required for permanent site)

In the **live** PawaPay dashboard → Callback URLs, paste **the same URL** for all fields:

```text
https://patriotic-youths-uganda.onrender.com/api/payments/pawapay/callback
```

Replace the hostname if your Render URL is different.

## Free plan note

- Free Render apps **sleep** after idle time; first open can take ~30–60 seconds.
- No Cloudflare tunnel needed after this.

## Local development

Keep using `http://localhost:3000` with `.env.local` as before.
