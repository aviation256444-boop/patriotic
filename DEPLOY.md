# Deploy to Render (permanent public URL)

GitHub: https://github.com/aviation256444-boop/patriotic

## One-click deploy

1. Open (logged into Render with **aviation256444-boop** GitHub):

   **https://render.com/deploy?repo=https://github.com/aviation256444-boop/patriotic**

2. Click **Apply** / create the Blueprint.
3. After the service exists, open **Environment** and set:

| Key | Value |
|-----|--------|
| `PAWAPAY_API_TOKEN` | Your **live** PawaPay token |
| `NEXT_PUBLIC_APP_URL` | `https://patriotic.onrender.com` *(or the exact URL Render shows)* |

Other PawaPay / app vars are already in `render.yaml`.

4. **Manual Deploy** → Clear build cache & deploy.
5. Wait until status is **Live** (5–15 min on free tier).

## Public links

```text
https://patriotic.onrender.com
https://patriotic.onrender.com/donate
```

## PawaPay live callbacks

```text
https://patriotic.onrender.com/api/payments/pawapay/callback
```

Paste that URL for Deposits (and other callback fields) in the **live** PawaPay dashboard.

## Free tier

App may sleep when idle; first visit can take 30–60 seconds to wake.
