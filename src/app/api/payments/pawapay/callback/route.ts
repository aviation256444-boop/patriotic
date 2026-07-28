import { NextResponse } from "next/server";
import { getCollection, upsertItem } from "@/lib/cms/store";
import { toCheckoutStatus } from "@/lib/pawapay/deposits";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  pawapayDepositId?: string | null;
  momoReferenceId?: string | null;
  externalId?: string;
  meta?: Record<string, unknown>;
};

/**
 * PawaPay deposit / payout / refund callbacks.
 *
 * Paste this public URL into the sandbox dashboard for all 4 fields:
 *   {NEXT_PUBLIC_APP_URL}/api/payments/pawapay/callback
 *
 * Supports v1 body: { depositId, status, ... }
 * Also accepts nested shapes / payoutId / refundId for future use.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    console.info("[pawapay-callback]", JSON.stringify(body).slice(0, 800));

    const depositId = String(
      body.depositId ||
        body.payoutId ||
        body.refundId ||
        (body.deposit as { depositId?: string } | undefined)?.depositId ||
        ""
    );
    const statusRaw = String(
      body.status ||
        (body.deposit as { status?: string } | undefined)?.status ||
        ""
    );

    if (!depositId) {
      // Still 200 so PawaPay does not hammer retries for malformed probes
      return NextResponse.json({ received: true, matched: false, error: "no id" });
    }

    const donations = (await getCollection("donations")) as DonationRow[];
    const donation =
      donations.find((d) => d.id === depositId) ||
      donations.find((d) => d.pawapayDepositId === depositId) ||
      donations.find((d) => d.momoReferenceId === depositId) ||
      donations.find(
        (d) =>
          d.meta &&
          typeof d.meta === "object" &&
          String((d.meta as { depositId?: string }).depositId || "") === depositId
      );

    if (!donation) {
      console.warn("PawaPay callback: donation not found", depositId);
      return NextResponse.json({ received: true, matched: false });
    }

    const failureReason = body.failureReason as
      | { failureCode?: string; failureMessage?: string }
      | undefined;
    const correspondentIds = body.correspondentIds as
      | Record<string, string>
      | undefined;

    const mapped = toCheckoutStatus(statusRaw);
    if (mapped === "SUCCESSFUL" && donation.status !== "completed") {
      const mmoRef =
        correspondentIds && Object.values(correspondentIds).find(Boolean);
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "completed",
          pawapayDepositId: depositId,
          momoReferenceId: depositId,
          paymentReference: mmoRef || depositId,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          callbackReceivedAt: new Date().toISOString(),
        },
        "pawapay-callback"
      );
    } else if (mapped === "FAILED" && donation.status !== "failed") {
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "failed",
          pawapayDepositId: depositId,
          failureReason:
            failureReason?.failureMessage ||
            failureReason?.failureCode ||
            statusRaw,
          updatedAt: new Date().toISOString(),
          callbackReceivedAt: new Date().toISOString(),
        },
        "pawapay-callback"
      );
    }

    return NextResponse.json({
      received: true,
      matched: true,
      status: mapped || statusRaw || "unknown",
      depositId,
    });
  } catch (error) {
    console.error("PawaPay callback error", error);
    // Return 200 when possible so transient parse issues don't loop forever
    return NextResponse.json(
      { error: "Callback failed", received: false },
      { status: 500 }
    );
  }
}

/** Health check for dashboards / tunnels */
export async function GET() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return NextResponse.json({
    ok: true,
    endpoint: `${appUrl}/api/payments/pawapay/callback`,
    message:
      "PawaPay callback ready. POST final payment statuses here. Use HTTPS public URL in dashboard.",
  });
}
