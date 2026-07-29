import { NextResponse } from "next/server";
import { requireSuperAdminAny } from "@/lib/auth/local-users";
import {
  getWithdrawal,
  updateWithdrawal,
  listWithdrawals,
} from "@/lib/payments/withdrawals";
import { getPayoutStatus } from "@/lib/pawapay/payouts";
import { getAvailableBalance } from "@/lib/payments/balance";
import { getPawaPayBaseUrl, getPawaPayEnv } from "@/lib/pawapay/config";

export const dynamic = "force-dynamic";

/**
 * Check payout status — mirrors PawaPay GET /payouts/{payoutId}
 * Docs: https://docs.pawapay.io/v1/api-reference/payouts/check-payout-status
 *
 * GET ?payoutId={uuid}&actorId=...
 * Optional: refresh all open withdrawals when payoutId omitted.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actorId =
      searchParams.get("actorId") || request.headers.get("x-actor-id") || "";
    const actorEmail =
      searchParams.get("actorEmail") ||
      request.headers.get("x-actor-email") ||
      "";
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }
    requireSuperAdminAny(actorId, actorEmail);

    const payoutId = (
      searchParams.get("payoutId") ||
      searchParams.get("id") ||
      ""
    ).trim();

    if (payoutId) {
      // Allow check even if not in local DB (same as docs Try-it)
      const existing = getWithdrawal(payoutId);
      const st = await getPayoutStatus(
        existing?.payoutId || payoutId
      );

      let updated = existing || null;
      if (existing) {
        if (st.status === "SUCCESSFUL" && existing.status !== "completed") {
          updated =
            updateWithdrawal(existing.id, {
              status: "completed",
              providerStatus: st.rawStatus || "COMPLETED",
            }) || existing;
        } else if (st.status === "FAILED" && existing.status !== "failed") {
          updated =
            updateWithdrawal(existing.id, {
              status: "failed",
              providerStatus: st.rawStatus || "FAILED",
              failureReason: st.reason || st.error,
            }) || existing;
        } else if (
          st.status === "PENDING" &&
          st.rawStatus &&
          existing.providerStatus !== st.rawStatus
        ) {
          updated =
            updateWithdrawal(existing.id, {
              providerStatus: st.rawStatus,
            }) || existing;
        }
      }

      return NextResponse.json(
        {
          success: true,
          /** How to fill docs Try-it / curl */
          docs: {
            url: "https://docs.pawapay.io/v1/api-reference/payouts/check-payout-status",
            method: "GET",
            path: `/payouts/{payoutId}`,
            server:
              getPawaPayEnv() === "production"
                ? "https://api.pawapay.io"
                : "https://api.sandbox.pawapay.io",
            pathParam: {
              payoutId:
                "The same UUIDv4 you sent when creating the payout (POST /payouts)",
            },
            auth: "Bearer <PAWAPAY_API_TOKEN>",
            exampleUrl: `${getPawaPayBaseUrl()}/payouts/${encodeURIComponent(payoutId)}`,
          },
          /** Mapped app status */
          status: st.status,
          pawaPayStatus: st.rawStatus,
          payoutId: st.payoutId || payoutId,
          amount: st.amount,
          currency: st.currency,
          country: st.country,
          correspondent: st.correspondent,
          msisdn: st.msisdn,
          created: st.created,
          receivedByRecipient: st.receivedByRecipient,
          failureCode: st.failureCode,
          reason: st.reason,
          error: st.error,
          /** Raw PawaPay list item (or []) */
          pawaPay: st.raw,
          withdrawal: updated,
          balance: await getAvailableBalance(),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Refresh all open payouts
    for (const w of listWithdrawals()) {
      if (w.status !== "pending" && w.status !== "processing") continue;
      if (w.method && w.method !== "payout") continue;
      try {
        const st = await getPayoutStatus(w.payoutId);
        if (st.status === "SUCCESSFUL") {
          updateWithdrawal(w.id, {
            status: "completed",
            providerStatus: st.rawStatus || "COMPLETED",
          });
        } else if (st.status === "FAILED") {
          updateWithdrawal(w.id, {
            status: "failed",
            providerStatus: st.rawStatus || "FAILED",
            failureReason: st.reason || st.error,
          });
        } else if (st.rawStatus) {
          updateWithdrawal(w.id, { providerStatus: st.rawStatus });
        }
      } catch {
        /* skip */
      }
    }

    return NextResponse.json({
      success: true,
      withdrawals: listWithdrawals().slice(0, 50),
      balance: await getAvailableBalance(),
      docs: {
        url: "https://docs.pawapay.io/v1/api-reference/payouts/check-payout-status",
        howTo:
          "Pass ?payoutId=YOUR-UUID to check one payout against PawaPay GET /payouts/{payoutId}",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Status failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
