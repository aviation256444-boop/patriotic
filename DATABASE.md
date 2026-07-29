# Durable database (Postgres)

By default this app used JSON files under `data/`. On **Render free tier**, that disk is wiped on every redeploy.

## Solution

When **`DATABASE_URL`** is set, all app data is stored in **Postgres** (`app_kv` JSONB table):

| Key | Contents |
|-----|----------|
| `users` | Accounts / passwords / roles |
| `cms` | Site CMS, donations, members, events… |
| `tickets` | Event tickets |
| `withdrawals` | Withdraw / refund ledger |
| `activity` | Activity log |

Local JSON files are still used as a **mirror/fallback** when the disk is writable.

## Setup (recommended free option: Neon)

1. Create a free Postgres DB: https://neon.tech (or Render Postgres / Supabase)
2. Copy the connection string, e.g.  
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. In **Render → patriotic-app → Environment** add:

```env
DATABASE_URL=postgresql://...your connection string...
```

4. **Manual Deploy** → Clear build cache & deploy  
5. Check: https://patriotic-app.onrender.com/api/system/db-health  

You should see:

```json
{ "backend": "postgres", "ok": true, "keys": ["users", "cms", ...] }
```

## Local development

Optional in `.env.local`:

```env
DATABASE_URL=postgresql://...
```

Without it, the app keeps using `data/*.json` on your machine.

## First boot with DATABASE_URL

If local JSON files exist, they are **migrated once** into Postgres automatically.

## Images / uploads

`data/uploads` can still be ephemeral on free Render. Prefer **Cloudinary** for permanent media.
