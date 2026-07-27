/**
 * MTN MoMo Collection Widget + Collections API configuration.
 * Docs: https://momodeveloper.mtn.com/  |  Widget: Collection Widget product
 */

export type MomoEnvironment = "sandbox" | "production";

export function getMomoEnv(): MomoEnvironment {
  const e = (process.env.NEXT_PUBLIC_MOMO_ENV || process.env.MOMO_TARGET_ENVIRONMENT || "sandbox")
    .toLowerCase()
    .trim();
  return e === "production" ? "production" : "sandbox";
}

/** Sandbox widget script (official MTN MoMo Collection Widget) */
export const MOMO_WIDGET_SCRIPT_SANDBOX =
  "https://widget.northeurope.cloudapp.azure.com:9443/v0.1.0/mobile-money-widget-mtn.js";

/** Production widget script — replace when MTN provides the live URL for your account */
export const MOMO_WIDGET_SCRIPT_PRODUCTION =
  process.env.NEXT_PUBLIC_MOMO_WIDGET_SCRIPT_PRODUCTION ||
  MOMO_WIDGET_SCRIPT_SANDBOX;

export function getMomoWidgetScriptUrl(): string {
  if (process.env.NEXT_PUBLIC_MOMO_WIDGET_SCRIPT) {
    return process.env.NEXT_PUBLIC_MOMO_WIDGET_SCRIPT;
  }
  return getMomoEnv() === "production"
    ? MOMO_WIDGET_SCRIPT_PRODUCTION
    : MOMO_WIDGET_SCRIPT_SANDBOX;
}

/**
 * API User ID (UUID) from MoMo Partner / Developer portal.
 * Sandbox: any valid UUID works for the widget.
 */
export function getMomoApiUserId(): string {
  return (
    process.env.NEXT_PUBLIC_MOMO_API_USER_ID ||
    process.env.MOMO_API_USER_ID ||
    // Public sandbox demo UUID — replace with your real API User ID for production
    "b12d7b22-3057-4c8e-ad50-63904171d18c"
  );
}

export function getMomoCurrency(): string {
  return (process.env.NEXT_PUBLIC_MOMO_CURRENCY || "UGX").toUpperCase();
}

export function isMomoEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_MOMO_ENABLED;
  if (flag === "false" || flag === "0") return false;
  return true;
}

/** Collections API (request-to-pay) — server-side only */
export function getMomoCollectionsConfig() {
  const env = getMomoEnv();
  // Production Uganda Collections uses X-Target-Environment: mtnuganda
  const targetEnvironment =
    process.env.MOMO_TARGET_ENVIRONMENT?.trim() ||
    (env === "production" ? "mtnuganda" : "sandbox");
  return {
    env,
    baseUrl:
      process.env.MOMO_BASE_URL ||
      (env === "production"
        ? "https://proxy.momoapi.mtn.com"
        : "https://sandbox.momodeveloper.mtn.com"),
    subscriptionKey:
      process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY ||
      process.env.MOMO_SUBSCRIPTION_KEY ||
      "",
    apiUserId: process.env.MOMO_API_USER_ID || getMomoApiUserId(),
    apiKey: process.env.MOMO_API_KEY || "",
    currency: getMomoCurrency(),
    callbackHost: process.env.MOMO_CALLBACK_HOST || process.env.NEXT_PUBLIC_APP_URL || "",
    targetEnvironment,
  };
}

export function hasCollectionsCredentials(): boolean {
  const c = getMomoCollectionsConfig();
  return Boolean(c.subscriptionKey && c.apiUserId && c.apiKey);
}

declare global {
  interface Window {
    mobileMoneyReinitializeWidgets?: () => void;
  }
}
