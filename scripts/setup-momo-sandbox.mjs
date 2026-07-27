/**
 * MTN MoMo Sandbox key setup helper
 *
 * Usage:
 *   node scripts/setup-momo-sandbox.mjs YOUR_PRIMARY_SUBSCRIPTION_KEY
 */

import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE = "https://sandbox.momodeveloper.mtn.com";
const subscriptionKey = process.argv[2]?.trim();
const productHint = (process.argv[3] || "collections").toLowerCase();

if (!subscriptionKey) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     MTN MoMo Sandbox — Get Your Keys                     ║
╚══════════════════════════════════════════════════════════╝

1. Sign up: https://momodeveloper.mtn.com
2. Products → Subscribe to **Collections** (for receiving payments)
   Also subscribe to Collection Widget if available.
3. Profile → copy Primary key
4. Run:
   node scripts/setup-momo-sandbox.mjs YOUR_PRIMARY_KEY

NOTE: Remittances keys only work for sending money OUT.
      Donations need the **Collections** product key.
`);
  process.exit(1);
}

const apiUserId = randomUUID();
const callbackHost = process.env.MOMO_CALLBACK_HOST || "localhost";

function upsertEnv(env, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) return env.replace(re, `${key}=${value}`);
  return env.trimEnd() + `\n${key}=${value}`;
}

async function main() {
  console.log("\n→ Creating sandbox API User:", apiUserId);

  const createUser = await fetch(`${BASE}/v1_0/apiuser`, {
    method: "POST",
    headers: {
      "X-Reference-Id": apiUserId,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ providerCallbackHost: callbackHost }),
  });

  if (createUser.status !== 201 && createUser.status !== 200) {
    const t = await createUser.text();
    console.error("\n✗ Failed to create API user.");
    console.error("  Status:", createUser.status);
    console.error("  Body:", t);
    console.error("\nTips:");
    console.error("  • Use PRIMARY key from an active product subscription");
    console.error("  • For donations you need Collections (not only Remittances)");
    process.exit(1);
  }
  console.log("✓ API User created");

  console.log("→ Creating API Key…");
  const createKey = await fetch(`${BASE}/v1_0/apiuser/${apiUserId}/apikey`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });

  if (!createKey.ok) {
    const t = await createKey.text();
    console.error("✗ Failed to create API key:", createKey.status, t);
    process.exit(1);
  }

  const { apiKey } = await createKey.json();
  if (!apiKey) {
    console.error("✗ No apiKey in response");
    process.exit(1);
  }
  console.log("✓ API Key created:", apiKey.slice(0, 6) + "…");

  // Test Collection token
  console.log("→ Testing Collections access token…");
  const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString("base64");
  const tokenRes = await fetch(`${BASE}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });

  let collectionsOk = tokenRes.ok;
  if (collectionsOk) {
    console.log("✓ Collections token OK — this key works for receiving payments!");
  } else {
    const errBody = await tokenRes.text();
    console.warn("⚠ Collections token failed:", tokenRes.status, errBody);
    console.warn(
      "  This usually means the Primary Key is for another product (e.g. Remittances)."
    );
    console.warn(
      "  For donations: Profile → subscribe to **Collections**, then re-run with that Primary key."
    );
  }

  // Test remittance token as fallback signal
  const remitRes = await fetch(`${BASE}/remittance/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });
  if (remitRes.ok) {
    console.log("✓ Remittance token OK — this key is for sending money out.");
  }

  const envPath = resolve(process.cwd(), ".env.local");
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  const common = {
    NEXT_PUBLIC_MOMO_ENABLED: "true",
    NEXT_PUBLIC_MOMO_ENV: "sandbox",
    NEXT_PUBLIC_MOMO_CURRENCY: "UGX",
    NEXT_PUBLIC_MOMO_API_USER_ID: apiUserId,
    MOMO_API_USER_ID: apiUserId,
    MOMO_API_KEY: apiKey,
    MOMO_BASE_URL: BASE,
    MOMO_TARGET_ENVIRONMENT: "sandbox",
  };

  for (const [k, v] of Object.entries(common)) {
    env = upsertEnv(env, k, v);
  }

  if (collectionsOk) {
    env = upsertEnv(env, "MOMO_COLLECTION_SUBSCRIPTION_KEY", subscriptionKey);
    env = upsertEnv(env, "MOMO_SUBSCRIPTION_KEY", subscriptionKey);
  } else {
    // Save remittance keys under remittance-specific names; keep old collection keys if any
    env = upsertEnv(env, "MOMO_REMITTANCE_SUBSCRIPTION_KEY", subscriptionKey);
    env = upsertEnv(env, "MOMO_REMITTANCE_SECONDARY_KEY", process.argv[4] || "");
    console.log(
      "\nSaved Remittances key as MOMO_REMITTANCE_SUBSCRIPTION_KEY (not used for donate)."
    );
  }

  writeFileSync(envPath, env.trimEnd() + "\n", "utf8");

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Keys written to .env.local                              ║
╚══════════════════════════════════════════════════════════╝
  API User ID: ${apiUserId}
  API Key:     ${apiKey.slice(0, 8)}…
  Collections usable for donations: ${collectionsOk ? "YES ✓" : "NO ✗ — subscribe to Collections"}

Restart: npm run dev
Donate:  http://localhost:3000/donate
`);

  if (!collectionsOk) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
