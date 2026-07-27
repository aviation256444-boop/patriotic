/**
 * Square Web Payments + Payments API config.
 * Developer Console: https://developer.squareup.com/console
 *
 * Public (browser): Application ID
 * Secret (server only): Access Token, never expose to client
 * Location ID: from Locations API or Console → Locations
 */

export type SquareEnvironment = "sandbox" | "production";

export function getSquareEnv(): SquareEnvironment {
  const e = (
    process.env.SQUARE_ENV ||
    process.env.NEXT_PUBLIC_SQUARE_ENV ||
    "sandbox"
  )
    .toLowerCase()
    .trim();
  return e === "production" || e === "live" ? "production" : "sandbox";
}

export function isSquareEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_SQUARE_ENABLED ?? process.env.SQUARE_ENABLED;
  if (flag === "false" || flag === "0") return false;
  // Enabled when we at least have an application id (UI can show card form)
  return Boolean(getSquareApplicationId());
}

export function getSquareApplicationId(): string {
  return (
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ||
    process.env.SQUARE_APPLICATION_ID ||
    ""
  ).trim();
}

export function getSquareLocationId(): string {
  return (
    process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ||
    process.env.SQUARE_LOCATION_ID ||
    ""
  ).trim();
}

export function getSquareAccessToken(): string {
  return (process.env.SQUARE_ACCESS_TOKEN || "").trim();
}

export function getSquareWebSdkUrl(): string {
  return getSquareEnv() === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
}

export function getSquareApiBaseUrl(): string {
  return getSquareEnv() === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

/** Server can charge when access token + location + app id exist */
export function hasSquareChargeCredentials(): boolean {
  return Boolean(
    getSquareAccessToken() && getSquareLocationId() && getSquareApplicationId()
  );
}

/** Client can mount card form when app id + location exist */
export function hasSquareWebPaymentsConfig(): boolean {
  return Boolean(getSquareApplicationId() && getSquareLocationId());
}
