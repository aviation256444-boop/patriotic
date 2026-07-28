import { NextResponse } from "next/server";
import { requireSuperAdminAny } from "@/lib/auth/local-users";
import {
  getWithdrawal,
  updateWithdrawal,
  listWithdrawals,
} from "@/lib/payments/withdrawals";
import { getPayoutStatus } from "@/lib/pawapay/payouts";
import { getAvailableBalance } from "@/lib/payments/balance";

export const dynamic = "force-dynamic";

/**
 * GET ?payoutId=...&actorId=...
 * Poll one withdrawal (or refresh all pending).
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

    const payoutId = searchParams.get("payoutId") || searchParams.get("id") || "";

    if (payoutId) {
      const existing = getWithdrawal(payoutId);
      if (!existing) {
        return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
      }
      const st = await getPayoutStatus(existing.payoutId);
      let updated = existing;
      if (st.status === "SUCCESSFUL" && existing.status !== "completed") {
        updated =
          updateWithdrawal(existing.id, {
            status: "completed",
            providerStatus: "COMPLETED",
          }) || existing;
      } else if (st.status === "FAILED" && existing.status !== "failed") {
        updated =
          updateWithdrawal(existing.id, {
            status: "failed",
            providerStatus: "FAILED",
            failureReason: st.reason || st.error,
          }) || existing;
      }
      return NextResponse.json({
        success: true,
        withdrawal: updated,
        providerStatus: st.status,
        balance: await getAvailableBalance(),
      });
    }

    // Refresh all open payouts
    for (const w of listWithdrawals()) {
      if (w.status !== "pending" && w.status !== "processing") continue;
      try {
        const st = await getPayoutStatus(w.payoutId);
        if (st.status === "SUCCESSFUL") {
          updateWithdrawal(w.id, { status: "completed", providerStatus: "COMPLETED" });
        } else if (st.status === "FAILED") {
          updateWithdrawal(w.id, {
            status: "failed",
            providerStatus: "FAILED",
            failureReason: st.reason || st.error,
          });
        }
      } catch {
        /* skip */
      }
    }

    return NextResponse.json({
      success: true,
      withdrawals: listWithdrawals().slice(0, 50),
      balance: await getAvailableBalance(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Status failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
