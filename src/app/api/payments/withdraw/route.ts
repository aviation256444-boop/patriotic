import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSuperAdminAny } from "@/lib/auth/local-users";
import { getAvailableBalance } from "@/lib/payments/balance";
import {
  createWithdrawal,
  listWithdrawals,
  updateWithdrawal,
} from "@/lib/payments/withdrawals";
import {
  initiatePayout,
  getPayoutStatus,
  getWalletBalances,
} from "@/lib/pawapay/payouts";
import { shouldUsePawaPay, getPawaPayEnv } from "@/lib/pawapay/config";
import { normalizePawaPayMsisdn } from "@/lib/pawapay/deposits";
import {
  getActiveConf,
  gatewaySupportsPayout,
  payoutNotConfiguredMessage,
} from "@/lib/pawapay/active-conf";
import { logActivity } from "@/lib/activity/log";

export const dynamic = "force-dynamic";

function actorFrom(request: Request, body?: Record<string, unknown>) {
  const { searchParams } = new URL(request.url);
  return {
    actorId:
      (body?.actorId as string) ||
      searchParams.get("actorId") ||
      request.headers.get("x-actor-id") ||
      "",
    actorEmail:
      (body?.actorEmail as string) ||
      searchParams.get("actorEmail") ||
      request.headers.get("x-actor-email") ||
      "",
  };
}

/**
 * GET — balance, wallet, recent withdrawals (super_admin only)
 * Query: actorId | actorEmail
 */
export async function GET(request: Request) {
  try {
    const { actorId, actorEmail } = actorFrom(request);
    if (!actorId && !actorEmail) {
      return NextResponse.json(
        { error: "Super admin identity required" },
        { status: 401 }
      );
    }
    requireSuperAdminAny(actorId, actorEmail);

    const balance = await getAvailableBalance();
    const withdrawals = listWithdrawals().slice(0, 50);
    const wallet = await getWalletBalances();
    const activeConf = await getActiveConf();

    // Refresh pending/processing from PawaPay
    for (const w of withdrawals) {
      if (w.status === "pending" || w.status === "processing") {
        try {
          const st = await getPayoutStatus(w.payoutId);
          if (st.status === "SUCCESSFUL") {
            updateWithdrawal(w.id, {
              status: "completed",
              providerStatus: "COMPLETED",
            });
          } else if (st.status === "FAILED") {
            updateWithdrawal(w.id, {
              status: "failed",
              providerStatus: "FAILED",
              failureReason: st.reason || st.error,
            });
          }
        } catch {
          /* keep */
        }
      }
    }

    const refreshed = listWithdrawals().slice(0, 50);
    const balanceAfter = await getAvailableBalance();

    return NextResponse.json(
      {
        success: true,
        balance: balanceAfter.available !== balance.available ? balanceAfter : balance,
        wallet: {
          ok: wallet.ok,
          balances: wallet.balances,
          error: wallet.error,
        },
        pawaPayReady: shouldUsePawaPay(),
        pawaPayEnv: getPawaPayEnv(),
        /** Merchant product capabilities from PawaPay /active-conf */
        capabilities: {
          merchantName: activeConf.merchantName,
          merchantId: activeConf.merchantId,
          payoutsEnabled: activeConf.payoutsEnabled,
          airtelPayout: activeConf.airtelPayout,
          mtnPayout: activeConf.mtnPayout,
          airtelDeposit: activeConf.airtelDeposit,
          mtnDeposit: activeConf.mtnDeposit,
          correspondents: activeConf.correspondents.map((c) => ({
            correspondent: c.correspondent,
            currency: c.currency,
            operations: c.operations,
          })),
          howToEnablePayouts: activeConf.payoutsEnabled
            ? null
            : "Your PawaPay merchant only has DEPOSIT (collect money) and REFUND — not PAYOUT (send to your phone). Email support@pawapay.io or your account manager: enable PAYOUT for AIRTEL_OAPI_UGA and MTN_MOMO_UGA, country UGA, currency UGX.",
        },
        withdrawals: refreshed,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * POST — withdraw available balance to super admin MTN / Airtel wallet
 * Body: { actorId, actorEmail, amount, phone, gateway: mtn_momo|airtel_money, note? }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { actorId, actorEmail } = actorFrom(request, body);
    if (!actorId && !actorEmail) {
      return NextResponse.json(
        { error: "Super admin identity required" },
        { status: 401 }
      );
    }
    const actor = requireSuperAdminAny(actorId, actorEmail);

    const amount = Math.round(Number(body.amount));
    const phone = String(body.phone || "").replace(/\s/g, "");
    const gateway = String(body.gateway || "") as "mtn_momo" | "airtel_money";
    const note = body.note ? String(body.note).slice(0, 120) : undefined;

    if (!amount || amount < 500) {
      return NextResponse.json(
        { error: "Minimum withdraw is UGX 500" },
        { status: 400 }
      );
    }
    if (gateway !== "mtn_momo" && gateway !== "airtel_money") {
      return NextResponse.json(
        { error: "Choose Airtel Money or MTN MoMo" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Enter the mobile money number to receive funds" },
        { status: 400 }
      );
    }

    const balance = await getAvailableBalance();
    if (amount > balance.available) {
      return NextResponse.json(
        {
          error: `Insufficient available balance. Available: UGX ${balance.available.toLocaleString()}`,
          available: balance.available,
        },
        { status: 400 }
      );
    }

    if (!shouldUsePawaPay()) {
      return NextResponse.json(
        {
          error:
            "Live withdrawals need PAWAPAY_API_TOKEN on the server. Funds sit in the PawaPay merchant wallet until payout succeeds.",
          code: "PAWAPAY_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const conf = await getActiveConf(true);
    if (conf.ok && !gatewaySupportsPayout(conf, gateway)) {
      return NextResponse.json(
        {
          error: payoutNotConfiguredMessage(conf, gateway),
          code: "NO_PAYOUT_FLOW",
          capabilities: {
            merchantName: conf.merchantName,
            airtelPayout: conf.airtelPayout,
            mtnPayout: conf.mtnPayout,
            operations: conf.correspondents.map((c) => ({
              correspondent: c.correspondent,
              operations: c.operations,
            })),
          },
        },
        { status: 503 }
      );
    }

    const payoutId = randomUUID();
    const payout = await initiatePayout({
      payoutId,
      amount,
      currency: "UGX",
      phone,
      gateway,
      statementDescription: "PYU Admin Withdraw",
      metadata: [
        { fieldName: "type", fieldValue: "admin_withdraw" },
        { fieldName: "actor", fieldValue: actor.email.slice(0, 64), isPII: true },
      ],
    });

    if (!payout.ok) {
      // Record failed attempt for audit
      createWithdrawal({
        payoutId,
        amount,
        currency: "UGX",
        gateway,
        phone,
        msisdn: payout.msisdn || normalizePawaPayMsisdn(phone),
        status: "failed",
        providerStatus: payout.status,
        failureReason: payout.error,
        actorId: actor.id,
        actorEmail: actor.email,
        actorName: actor.fullName,
        note,
        live: true,
      });
      return NextResponse.json(
        {
          error: payout.error || "Payout failed",
          rejectionCode: payout.rejectionCode,
          code: "PAYOUT_FAILED",
        },
        { status: 502 }
      );
    }

    const initialStatus =
      payout.status === "ACCEPTED" || payout.status === "ENQUEUED"
        ? "processing"
        : payout.status === "DUPLICATE_IGNORED"
          ? "processing"
          : "processing";

    const row = createWithdrawal({
      payoutId: payout.payoutId || payoutId,
      amount,
      currency: "UGX",
      gateway,
      phone,
      msisdn: payout.msisdn || normalizePawaPayMsisdn(phone),
      status: initialStatus,
      providerStatus: payout.status,
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.fullName,
      note,
      live: true,
    });

    // Quick status poll (often still pending)
    try {
      const st = await getPayoutStatus(row.payoutId);
      if (st.status === "SUCCESSFUL") {
        updateWithdrawal(row.id, {
          status: "completed",
          providerStatus: "COMPLETED",
        });
      } else if (st.status === "FAILED") {
        updateWithdrawal(row.id, {
          status: "failed",
          providerStatus: "FAILED",
          failureReason: st.reason || st.error,
        });
      }
    } catch {
      /* keep processing */
    }

    const final = updateWithdrawal(row.id, {}) || row;
    const balanceAfter = await getAvailableBalance();

    logActivity({
      kind: "payment",
      action: `Super admin withdrew UGX ${amount.toLocaleString()} to ${gateway} ${phone}`,
      actor: actor.email,
      target: final.payoutId,
      meta: { amount, gateway, phone, status: final.status },
    });

    return NextResponse.json({
      success: true,
      withdrawal: final,
      balance: balanceAfter,
      message:
        final.status === "completed"
          ? `UGX ${amount.toLocaleString()} sent to your ${gateway === "airtel_money" ? "Airtel" : "MTN"} wallet.`
          : `Payout submitted. Money is being sent to ${phone}. Status updates automatically.`,
    });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Withdraw failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
