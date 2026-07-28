import { NextResponse } from "next/server";
import { getCollection, upsertItem } from "@/lib/cms/store";
import { toCheckoutStatus } from "@/lib/pawapay/deposits";
import { mapPayoutStatus } from "@/lib/pawapay/payouts";
import { mapRefundStatus } from "@/lib/pawapay/refunds";
import { getWithdrawal, updateWithdrawal } from "@/lib/payments/withdrawals";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  pawapayDepositId?: string | null;
  momoReferenceId?: string | null;
  externalId?: string;
  meta?: Record<string, unknown>;
  refundId?: string | null;
  refundStatus?: string;
  refundedAmount?: number;
};

/**
 * PawaPay deposit / payout / refund callbacks.
 *
 * Paste this public URL into the live dashboard for all fields:
 *   {NEXT_PUBLIC_APP_URL}/api/payments/pawapay/callback
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    console.info("[pawapay-callback]", JSON.stringify(body).slice(0, 800));

    const payoutIdOnly = String(
      body.payoutId ||
        (body.payout as { payoutId?: string } | undefined)?.payoutId ||
        ""
    );
    const refundIdOnly = String(
      body.refundId ||
        (body.refund as { refundId?: string } | undefined)?.refundId ||
        ""
    );
    const depositId = String(
      body.depositId ||
        (body.deposit as { depositId?: string } | undefined)?.depositId ||
        ""
    );
    const statusRaw = String(
      body.status ||
        (body.deposit as { status?: string } | undefined)?.status ||
        (body.payout as { status?: string } | undefined)?.status ||
        (body.refund as { status?: string } | undefined)?.status ||
        ""
    );

    // ── Refund (return money to original payer) ──────────────────────
    if (refundIdOnly) {
      const withdrawal = getWithdrawal(refundIdOnly);
      const mapped = mapRefundStatus(statusRaw);
      if (withdrawal) {
        if (mapped === "SUCCESSFUL" && withdrawal.status !== "completed") {
          updateWithdrawal(withdrawal.id, {
            status: "completed",
            providerStatus: statusRaw || "COMPLETED",
          });
        } else if (mapped === "FAILED" && withdrawal.status !== "failed") {
          const failureReason = body.failureReason as
            | { failureCode?: string; failureMessage?: string }
            | undefined;
          updateWithdrawal(withdrawal.id, {
            status: "failed",
            providerStatus: statusRaw || "FAILED",
            failureReason:
              failureReason?.failureMessage ||
              failureReason?.failureCode ||
              statusRaw,
          });
        }
      }

      // Mark donation refund status
      const donations = (await getCollection("donations")) as DonationRow[];
      const donation =
        donations.find((d) => d.refundId === refundIdOnly) ||
        (withdrawal?.paymentId
          ? donations.find((d) => d.id === withdrawal.paymentId)
          : undefined) ||
        (depositId
          ? donations.find(
              (d) =>
                d.pawapayDepositId === depositId ||
                d.momoReferenceId === depositId ||
                d.id === depositId
            )
          : undefined);

      if (donation) {
        if (mapped === "SUCCESSFUL") {
          await upsertItem(
            "donations",
            {
              ...donation,
              id: donation.id,
              refundId: refundIdOnly,
              refundStatus: "completed",
              refundedAmount:
                withdrawal?.amount ||
                donation.refundedAmount ||
                donation.amount,
              updatedAt: new Date().toISOString(),
              callbackReceivedAt: new Date().toISOString(),
            },
            "pawapay-refund-callback"
          );
        } else if (mapped === "FAILED") {
          await upsertItem(
            "donations",
            {
              ...donation,
              id: donation.id,
              refundId: refundIdOnly,
              refundStatus: "failed",
              updatedAt: new Date().toISOString(),
              callbackReceivedAt: new Date().toISOString(),
            },
            "pawapay-refund-callback"
          );
        }
      }

      return NextResponse.json({
        received: true,
        matched: Boolean(withdrawal || donation),
        type: "refund",
        refundId: refundIdOnly,
        status: mapped || statusRaw,
      });
    }

    // ── Payout (super-admin withdraw) ────────────────────────────────
    if (payoutIdOnly) {
      const withdrawal = getWithdrawal(payoutIdOnly);
      if (withdrawal) {
        const mapped = mapPayoutStatus(statusRaw);
        if (mapped === "SUCCESSFUL" && withdrawal.status !== "completed") {
          updateWithdrawal(withdrawal.id, {
            status: "completed",
            providerStatus: statusRaw || "COMPLETED",
          });
        } else if (mapped === "FAILED" && withdrawal.status !== "failed") {
          const failureReason = body.failureReason as
            | { failureCode?: string; failureMessage?: string }
            | undefined;
          updateWithdrawal(withdrawal.id, {
            status: "failed",
            providerStatus: statusRaw || "FAILED",
            failureReason:
              failureReason?.failureMessage ||
              failureReason?.failureCode ||
              statusRaw,
          });
        }
        return NextResponse.json({
          received: true,
          matched: true,
          type: "payout",
          payoutId: payoutIdOnly,
          status: mapped || statusRaw,
        });
      }
    }

    if (!depositId && !payoutIdOnly && !refundIdOnly) {
      // Still 200 so PawaPay does not hammer retries for malformed probes
      return NextResponse.json({ received: true, matched: false, error: "no id" });
    }

    if (!depositId) {
      return NextResponse.json({ received: true, matched: false, type: "unknown" });
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
