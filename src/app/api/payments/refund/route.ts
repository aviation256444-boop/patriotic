import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSuperAdminAny } from "@/lib/auth/local-users";
import { getCollection, upsertItem } from "@/lib/cms/store";
import { initiateRefund, getRefundStatus } from "@/lib/pawapay/refunds";
import { createWithdrawal, updateWithdrawal } from "@/lib/payments/withdrawals";
import { getAvailableBalance } from "@/lib/payments/balance";
import { shouldUsePawaPay } from "@/lib/pawapay/config";
import { normalizePawaPayMsisdn } from "@/lib/pawapay/deposits";
import { logActivity } from "@/lib/activity/log";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  pawapayDepositId?: string | null;
  momoReferenceId?: string | null;
  paymentMethod?: string;
  liveCharge?: boolean;
  demoMode?: boolean;
  refundId?: string | null;
  refundStatus?: string;
  refundedAmount?: number;
};

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
 * GET — list refundable completed deposits (super_admin)
 */
export async function GET(request: Request) {
  try {
    const { actorId, actorEmail } = actorFrom(request);
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }
    requireSuperAdminAny(actorId, actorEmail);

    const donations = (await getCollection("donations")) as DonationRow[];
    const refundable = donations
      .filter((d) => {
        if (d.status !== "completed") return false;
        if (d.demoMode) return false;
        if (d.refundStatus === "completed" || d.refundStatus === "processing")
          return false;
        const depositId = d.pawapayDepositId || d.momoReferenceId || d.id;
        return Boolean(depositId && /^[0-9a-f-]{36}$/i.test(String(depositId)));
      })
      .map((d) => ({
        id: d.id,
        externalId: d.externalId,
        amount: d.amount,
        currency: d.currency || "UGX",
        donorName: d.isAnonymous ? "Anonymous" : d.donorName,
        phone: d.phone,
        paymentMethod: d.paymentMethod,
        depositId: d.pawapayDepositId || d.momoReferenceId || d.id,
        paidAt: (d as { paidAt?: string }).paidAt || d.createdAt,
        campaign: d.campaign,
        purpose: d.purpose,
      }))
      .sort((a, b) => {
        return (
          new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime()
        );
      })
      .slice(0, 80);

    return NextResponse.json(
      {
        success: true,
        note:
          "REFUND always returns money to the original payer’s phone — not to the super admin. Use this to reverse a donation/ticket payment. To put merchant balance on YOUR phone you need PAYOUT (or PawaPay dashboard settlement).",
        refundable,
        count: refundable.length,
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
 * POST — refund a completed payment back to the original payer
 * Body: { actorId, actorEmail, paymentId, amount?, note? }
 *
 * This uses PawaPay REFUND (enabled on your account).
 * It does NOT withdraw to the admin wallet.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { actorId, actorEmail } = actorFrom(request, body);
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }
    const actor = requireSuperAdminAny(actorId, actorEmail);

    if (!shouldUsePawaPay()) {
      return NextResponse.json(
        { error: "PawaPay not configured", code: "PAWAPAY_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const paymentId = String(body.paymentId || body.donationId || "");
    const depositIdIn = body.depositId ? String(body.depositId) : "";
    const amountHint =
      body.amount != null ? Math.round(Number(body.amount)) : undefined;
    const note = body.note ? String(body.note).slice(0, 120) : undefined;

    const donations = (await getCollection("donations")) as DonationRow[];
    const donation =
      donations.find((d) => d.id === paymentId) ||
      donations.find((d) => d.externalId === paymentId) ||
      donations.find(
        (d) =>
          d.pawapayDepositId === depositIdIn || d.momoReferenceId === depositIdIn
      );

    if (!donation || donation.status !== "completed") {
      return NextResponse.json(
        { error: "Completed payment not found for refund" },
        { status: 404 }
      );
    }

    if (donation.refundStatus === "completed") {
      return NextResponse.json(
        { error: "This payment was already refunded" },
        { status: 400 }
      );
    }

    const depositId = String(
      depositIdIn ||
        donation.pawapayDepositId ||
        donation.momoReferenceId ||
        donation.id
    );
    if (!/^[0-9a-f-]{36}$/i.test(depositId)) {
      return NextResponse.json(
        {
          error:
            "This payment has no PawaPay deposit UUID — only live PawaPay charges can be refunded via API.",
        },
        { status: 400 }
      );
    }

    const amount = amountHint || Math.round(Number(donation.amount) || 0);
    if (amount < 500) {
      return NextResponse.json({ error: "Minimum refund is UGX 500" }, { status: 400 });
    }
    if (amount > Number(donation.amount)) {
      return NextResponse.json(
        { error: "Refund amount cannot exceed original payment" },
        { status: 400 }
      );
    }

    const gateway = (
      donation.paymentMethod === "mtn_momo" ? "mtn_momo" : "airtel_money"
    ) as "mtn_momo" | "airtel_money";

    const refundId = randomUUID();
    const result = await initiateRefund({
      refundId,
      depositId,
      amount,
      gateway,
      metadata: [
        { fieldName: "type", fieldValue: "admin_refund" },
        { fieldName: "paymentId", fieldValue: donation.id.slice(0, 64) },
        { fieldName: "actor", fieldValue: actor.email.slice(0, 64), isPII: true },
      ],
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || "Refund failed",
          code: result.rejectionCode || "REFUND_FAILED",
        },
        { status: 502 }
      );
    }

    await upsertItem(
      "donations",
      {
        ...donation,
        id: donation.id,
        refundId: result.refundId || refundId,
        refundStatus: "processing",
        refundedAmount: amount,
        updatedAt: new Date().toISOString(),
      },
      actor.email
    );

    const phone = donation.phone || "";
    const row = createWithdrawal({
      payoutId: result.refundId || refundId,
      amount,
      currency: donation.currency || "UGX",
      gateway,
      phone,
      msisdn: phone ? normalizePawaPayMsisdn(phone) : "",
      status: "processing",
      providerStatus: result.status,
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.fullName,
      note: note || `Refund to original payer (${phone || "unknown"})`,
      live: true,
      method: "refund",
      depositId,
      paymentId: donation.id,
    });

    // Quick status poll
    try {
      const st = await getRefundStatus(row.payoutId);
      if (st.status === "SUCCESSFUL") {
        updateWithdrawal(row.id, { status: "completed", providerStatus: "COMPLETED" });
        await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            refundId: row.payoutId,
            refundStatus: "completed",
            refundedAmount: amount,
            // Keep payment record; refundStatus marks money returned to original payer
            status: "completed",
            updatedAt: new Date().toISOString(),
          },
          actor.email
        );
      } else if (st.status === "FAILED") {
        updateWithdrawal(row.id, {
          status: "failed",
          providerStatus: "FAILED",
          failureReason: st.reason || st.error,
        });
        await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            refundStatus: "failed",
            updatedAt: new Date().toISOString(),
          },
          actor.email
        );
      }
    } catch {
      /* keep processing */
    }

    logActivity({
      kind: "payment",
      action: `Refund UGX ${amount.toLocaleString()} for payment ${donation.id} → original payer`,
      actor: actor.email,
      target: row.payoutId,
      meta: { amount, depositId, paymentId: donation.id, method: "refund" },
    });

    return NextResponse.json({
      success: true,
      withdrawal: updateWithdrawal(row.id, {}) || row,
      balance: await getAvailableBalance(),
      message:
        `Refund submitted: UGX ${amount.toLocaleString()} will return to the original payer` +
        (phone ? ` (${phone})` : "") +
        `. This is not a withdraw to the super-admin wallet.`,
    });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Refund failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
