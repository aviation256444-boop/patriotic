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
  waitForPayoutResult,
  getWalletBalances,
  correspondentForGateway,
} from "@/lib/pawapay/payouts";
import { shouldUsePawaPay, getPawaPayEnv, getPawaPayCurrency } from "@/lib/pawapay/config";
import { normalizePawaPayMsisdn } from "@/lib/pawapay/deposits";
import { getActiveConf } from "@/lib/pawapay/active-conf";
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
          /** From active-conf — informational. Withdraw still POSTs /payouts. */
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
          api: {
            method: "POST",
            path: "/v2/payouts",
            body: {
              payoutId: "UUIDv4",
              amount: "string",
              currency: "UGX",
              recipient: {
                type: "MMO",
                accountDetails: {
                  phoneNumber: "2567XXXXXXXX",
                  provider: "MTN_MOMO_UGA | AIRTEL_OAPI_UGA",
                },
              },
            },
            poll: "GET /v2/payouts/{payoutId}",
            docs: "https://docs.pawapay.io/v2/api-reference/payouts/initiate-payout",
          },
          howToEnablePayouts: activeConf.payoutsEnabled
            ? null
            : "If PawaPay returns PAYOUTS_NOT_ALLOWED, ask support to enable payouts for MTN_MOMO_UGA and AIRTEL_OAPI_UGA. App now uses POST /v2/payouts as they documented.",
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
 * POST — withdraw via PawaPay POST /v2/payouts (support-recommended shape)
 * Body: { actorId, actorEmail, amount, phone, gateway: mtn_momo|airtel_money, note? }
 *
 * recipient.accountDetails.phoneNumber = number YOU typed
 * recipient.accountDetails.provider = MTN_MOMO_UGA | AIRTEL_OAPI_UGA
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
    const skipBalance =
      body.skipBalanceCheck === true || body.skipBalanceCheck === "true";

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
    if (!skipBalance && amount > balance.available) {
      return NextResponse.json(
        {
          error: `App ledger available is UGX ${balance.available.toLocaleString()}. ` +
            `Lower the amount, or set skipBalanceCheck if money is already in the PawaPay wallet.`,
          available: balance.available,
          code: "APP_BALANCE_LOW",
        },
        { status: 400 }
      );
    }

    if (!shouldUsePawaPay()) {
      return NextResponse.json(
        {
          error:
            "Live withdrawals need PAWAPAY_API_TOKEN on the server.",
          code: "PAWAPAY_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const currency = getPawaPayCurrency();
    const correspondent = correspondentForGateway(gateway);
    const payoutId = randomUUID();

    // Always POST /payouts — PawaPay returns ACCEPTED | ENQUEUED | REJECTED
    const payout = await initiatePayout({
      payoutId,
      amount,
      currency,
      phone,
      gateway,
      forceAttempt: true,
      // Minimal v2 body (matches PawaPay support example); optional message omitted
      clientReferenceId: `withdraw-${actor.id}`.slice(0, 64),
    });

    if (!payout.ok) {
      createWithdrawal({
        payoutId: payout.payoutId || payoutId,
        amount,
        currency,
        gateway,
        phone,
        msisdn: payout.msisdn || normalizePawaPayMsisdn(phone),
        status: "failed",
        providerStatus: payout.status || "REJECTED",
        failureReason: payout.error,
        actorId: actor.id,
        actorEmail: actor.email,
        actorName: actor.fullName,
        note,
        live: true,
        method: "payout",
      });
      return NextResponse.json(
        {
          error: payout.error || "Payout rejected by PawaPay",
          rejectionCode: payout.rejectionCode,
          code: "PAYOUT_FAILED",
          request: {
            payoutId,
            amount: payout.amount,
            currency,
            correspondent,
            recipient: payout.msisdn,
          },
          pawaPay: payout.raw,
        },
        { status: 502 }
      );
    }

    const row = createWithdrawal({
      payoutId: payout.payoutId || payoutId,
      amount,
      currency,
      gateway,
      phone,
      msisdn: payout.msisdn || normalizePawaPayMsisdn(phone),
      status: "processing",
      providerStatus: payout.status, // ACCEPTED | ENQUEUED | DUPLICATE_IGNORED
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.fullName,
      note,
      live: true,
      method: "payout",
    });

    // Poll final status (async API)
    try {
      const st = await waitForPayoutResult(row.payoutId, {
        attempts: 6,
        delayMs: 1500,
      });
      if (st.status === "SUCCESSFUL") {
        updateWithdrawal(row.id, {
          status: "completed",
          providerStatus: st.rawStatus || "COMPLETED",
        });
      } else if (st.status === "FAILED") {
        updateWithdrawal(row.id, {
          status: "failed",
          providerStatus: st.rawStatus || "FAILED",
          failureReason: st.reason || st.error,
        });
      } else {
        // Still ACCEPTED/ENQUEUED — callback or later poll will finish
        updateWithdrawal(row.id, {
          status: "processing",
          providerStatus: st.rawStatus || payout.status,
        });
      }
    } catch {
      /* keep processing */
    }

    const final = updateWithdrawal(row.id, {}) || row;
    const balanceAfter = await getAvailableBalance();

    logActivity({
      kind: "payment",
      action: `Payout UGX ${amount.toLocaleString()} → ${gateway} ${phone} (${payout.status})`,
      actor: actor.email,
      target: final.payoutId,
      meta: {
        amount,
        gateway,
        phone,
        status: final.status,
        pawaPayStatus: payout.status,
        correspondent,
        payoutId: final.payoutId,
      },
    });

    const network = gateway === "airtel_money" ? "Airtel Money" : "MTN MoMo";
    return NextResponse.json({
      success: true,
      withdrawal: final,
      balance: balanceAfter,
      pawaPay: {
        payoutId: final.payoutId,
        initiationStatus: payout.status,
        correspondent,
        currency,
        amount: payout.amount,
        msisdn: payout.msisdn,
      },
      message:
        final.status === "completed"
          ? `UGX ${amount.toLocaleString()} paid out to ${network} ${phone}.`
          : final.status === "failed"
            ? `Payout failed: ${final.failureReason || "see PawaPay"}`
            : `Payout ${payout.status} — UGX ${amount.toLocaleString()} to ${phone}. ` +
              `Final status via callback or poll GET /payouts/${final.payoutId}.`,
    });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Withdraw failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
