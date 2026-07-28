/**
 * When false (production default), mobile money cannot be “completed”
 * with an in-app PIN — only live PawaPay / MoMo / Airtel status counts.
 */
export function isPaymentDemoAllowed(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_DEMO_MODE ??
    process.env.PAYMENT_DEMO_MODE ??
    process.env.DEMO_MODE;
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  // Local/dev convenience only
  return process.env.NODE_ENV !== "production";
}
