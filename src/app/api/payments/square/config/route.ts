import { NextResponse } from "next/server";
import {
  getSquareApplicationId,
  getSquareEnv,
  getSquareLocationId,
  hasSquareChargeCredentials,
  hasSquareWebPaymentsConfig,
  isSquareEnabled,
} from "@/lib/square/config";

export const dynamic = "force-dynamic";

/** Public Square config for the Web Payments SDK (no secrets). */
export async function GET() {
  return NextResponse.json({
    enabled: isSquareEnabled(),
    env: getSquareEnv(),
    applicationId: getSquareApplicationId(),
    locationId: getSquareLocationId(),
    webPaymentsReady: hasSquareWebPaymentsConfig(),
    chargeReady: hasSquareChargeCredentials(),
  });
}
