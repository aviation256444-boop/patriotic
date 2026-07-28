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
  paidAt?: string;
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

function phonesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const na = normalizePawaPayMsisdn(a);
  const nb = normalizePawaPayMsisdn(b);
  if (na.length >= 11 && nb.length >= 11 && na === nb) return true;
  // Also compare last 9 digits (local UG mobile)
  const ta = na.replace(/\D/g, "").slice(-9);
  const tb = nb.replace(/\D/g, "").slice(-9);
  return ta.length === 9 && ta === tb;
}

function isRefundable(d: DonationRow): boolean {
  if (d.status !== "completed") return false;
  if (d.demoMode) return false;
  if (d.refundStatus === "completed" || d.refundStatus === "processing") return false;
  const depositId = d.pawapayDepositId || d.momoReferenceId || d.id;
  return Boolean(depositId && /^[0-9a-f-]{36}$/i.test(String(depositId)));
}

function toRefundableRow(d: DonationRow) {
  return {
    id: d.id,
    externalId: d.externalId,
    amount: d.amount,
    currency: d.currency || "UGX",
    donorName: d.isAnonymous ? "Anonymous" : d.donorName,
    phone: d.phone,
    paymentMethod: d.paymentMethod,
    depositId: d.pawapayDepositId || d.momoReferenceId || d.id,
    paidAt: d.paidAt || d.createdAt,
    campaign: d.campaign,
    purpose: d.purpose,
  };
}

async function processOneRefund(opts: {
  donation: DonationRow;
  amount: number;
  actor: { id: string; email: string; fullName: string };
  note?: string;
  phoneOverride?: string;
}) {
  const { donation, amount, actor, note, phoneOverride } = opts;
  const depositId = String(
    donation.pawapayDepositId || donation.momoReferenceId || donation.id
  );
  const gateway = (
    donation.paymentMethod === "mtn_momo" ? "mtn_momo" : "airtel_money"
  ) as "mtn_momo" | "airtel_money";
  const phone = phoneOverride || donation.phone || "";
  const refundId = randomUUID();

  const result = await initiateRefund({
    refundId,
    depositId,
    amount,
    gateway,
    metadata: [
      { fieldName: "type", fieldValue: "manual_refund" },
      { fieldName: "paymentId", fieldValue: donation.id.slice(0, 64) },
      { fieldName: "actor", fieldValue: actor.email.slice(0, 64), isPII: true },
    ],
  });

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error || "Refund failed",
      code: result.rejectionCode || "REFUND_FAILED",
      donationId: donation.id,
    };
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
    note: note || `Manual refund to ${phone || "payer"}`,
    live: true,
    method: "refund",
    depositId,
    paymentId: donation.id,
  });

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
    action: `Manual refund UGX ${amount.toLocaleString()} → ${phone || "payer"} (payment ${donation.id})`,
    actor: actor.email,
    target: row.payoutId,
    meta: { amount, depositId, paymentId: donation.id, phone, method: "refund" },
  });

  return {
    ok: true as const,
    withdrawal: updateWithdrawal(row.id, {}) || row,
    donationId: donation.id,
    amount,
    phone,
    depositId,
  };
}

/**
 * GET — list refundable completed deposits (super_admin)
 * Optional: ?phone=0752… to filter by payer number
 */
export async function GET(request: Request) {
  try {
    const { actorId, actorEmail } = actorFrom(request);
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }
    requireSuperAdminAny(actorId, actorEmail);

    const { searchParams } = new URL(request.url);
    const phoneFilter = searchParams.get("phone") || "";

    const donations = (await getCollection("donations")) as DonationRow[];
    let refundable = donations.filter(isRefundable).map(toRefundableRow);

    if (phoneFilter.trim()) {
      refundable = refundable.filter((d) => phonesMatch(d.phone, phoneFilter));
    }

    refundable = refundable
      .sort((a, b) => {
        return (
          new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime()
        );
      })
      .slice(0, 80);

    const matchTotal = refundable.reduce((s, d) => s + (Number(d.amount) || 0), 0);

    return NextResponse.json(
      {
        success: true,
        note:
          "Manual refund: enter the payer phone + amount. We match completed payments from that number and refund them via PawaPay. Money goes only to that same number.",
        refundable,
        count: refundable.length,
        matchTotal,
        phoneFilter: phoneFilter || null,
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
 * POST — refund
 *
 * A) Manual by phone (preferred UX):
 *    { mode: "manual", phone, amount, note?, actorId, actorEmail }
 *    Finds completed payments from that phone and refunds up to amount.
 *
 * B) Single payment:
 *    { paymentId, depositId?, amount?, note?, actorId, actorEmail }
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

    const mode = String(body.mode || "").toLowerCase();
    const phoneIn = body.phone ? String(body.phone).replace(/\s/g, "") : "";
    const paymentId = String(body.paymentId || body.donationId || "");
    const depositIdIn = body.depositId ? String(body.depositId) : "";
    const amountHint =
      body.amount != null ? Math.round(Number(body.amount)) : undefined;
    const note = body.note ? String(body.note).slice(0, 120) : undefined;

    const isManual =
      mode === "manual" ||
      (Boolean(phoneIn) && !paymentId && !depositIdIn);

    // ── Manual: phone + amount ───────────────────────────────────────
    if (isManual) {
      if (!phoneIn) {
        return NextResponse.json(
          { error: "Enter the mobile money number to refund" },
          { status: 400 }
        );
      }
      const msisdn = normalizePawaPayMsisdn(phoneIn);
      if (!msisdn || msisdn.length < 11) {
        return NextResponse.json(
          { error: "Invalid phone number (use e.g. 0752 123 456)" },
          { status: 400 }
        );
      }
      if (!amountHint || amountHint < 500) {
        return NextResponse.json(
          { error: "Enter refund amount (minimum UGX 500)" },
          { status: 400 }
        );
      }

      const donations = (await getCollection("donations")) as DonationRow[];
      const matches = donations
        .filter(isRefundable)
        .filter((d) => phonesMatch(d.phone, phoneIn))
        // oldest first so we clear older charges first
        .sort((a, b) => {
          const ta = new Date(a.paidAt || a.createdAt || 0).getTime();
          const tb = new Date(b.paidAt || b.createdAt || 0).getTime();
          return ta - tb;
        });

      if (matches.length === 0) {
        return NextResponse.json(
          {
            error:
              `No refundable completed payment found for ${phoneIn}. ` +
              `That number must have paid via PawaPay (Airtel/MTN) on this site first. ` +
              `Refunds only return money to the same number that paid.`,
            code: "NO_MATCHING_PAYMENT",
            phone: phoneIn,
            msisdn,
          },
          { status: 404 }
        );
      }

      const availableFromPhone = matches.reduce(
        (s, d) => s + (Number(d.amount) || 0),
        0
      );
      if (amountHint > availableFromPhone) {
        return NextResponse.json(
          {
            error:
              `Only UGX ${availableFromPhone.toLocaleString()} can be refunded to ${phoneIn} ` +
              `(from ${matches.length} payment(s) by that number).`,
            available: availableFromPhone,
            matchCount: matches.length,
            code: "AMOUNT_TOO_HIGH",
          },
          { status: 400 }
        );
      }

      let remaining = amountHint;
      const results: Array<{
        donationId: string;
        amount: number;
        ok: boolean;
        error?: string;
        withdrawalId?: string;
      }> = [];

      for (const donation of matches) {
        if (remaining < 500) break;
        const maxForThis = Math.round(Number(donation.amount) || 0);
        if (maxForThis < 500) continue;
        const slice = Math.min(remaining, maxForThis);
        if (slice < 500) break;

        // Re-load latest donation row (may have been updated)
        const latestList = (await getCollection("donations")) as DonationRow[];
        const latest =
          latestList.find((d) => d.id === donation.id) || donation;
        if (!isRefundable(latest)) continue;

        const one = await processOneRefund({
          donation: latest,
          amount: slice,
          actor: {
            id: actor.id,
            email: actor.email,
            fullName: actor.fullName,
          },
          note: note || `Manual refund to ${phoneIn}`,
          phoneOverride: phoneIn,
        });

        if (!one.ok) {
          results.push({
            donationId: donation.id,
            amount: slice,
            ok: false,
            error: one.error,
          });
          // Stop on first hard failure so we don't partial-chaos
          return NextResponse.json(
            {
              error: one.error || "Refund failed",
              code: one.code,
              partial: results,
              refundedSoFar: results
                .filter((r) => r.ok)
                .reduce((s, r) => s + r.amount, 0),
            },
            { status: 502 }
          );
        }

        results.push({
          donationId: one.donationId,
          amount: one.amount,
          ok: true,
          withdrawalId: one.withdrawal.id,
        });
        remaining -= slice;
      }

      const refundedTotal = results
        .filter((r) => r.ok)
        .reduce((s, r) => s + r.amount, 0);

      if (refundedTotal < 500) {
        return NextResponse.json(
          {
            error: "Could not complete any refund for this number",
            results,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: "manual",
        phone: phoneIn,
        msisdn,
        refundedTotal,
        requestedAmount: amountHint,
        paymentsRefunded: results.filter((r) => r.ok).length,
        results,
        balance: await getAvailableBalance(),
        message:
          `Refund of UGX ${refundedTotal.toLocaleString()} submitted to ${phoneIn}. ` +
          `Money returns only to that number (the payer).`,
      });
    }

    // ── Single payment refund ────────────────────────────────────────
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

    // Optional safety: if phone was typed, must match the payment phone
    if (phoneIn && donation.phone && !phonesMatch(phoneIn, donation.phone)) {
      return NextResponse.json(
        {
          error:
            `Phone ${phoneIn} does not match the number that paid this charge (${donation.phone}). ` +
            `Refunds only go to the original payer.`,
          code: "PHONE_MISMATCH",
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

    const one = await processOneRefund({
      donation,
      amount,
      actor: {
        id: actor.id,
        email: actor.email,
        fullName: actor.fullName,
      },
      note,
      phoneOverride: phoneIn || donation.phone || undefined,
    });

    if (!one.ok) {
      return NextResponse.json(
        { error: one.error || "Refund failed", code: one.code },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "single",
      withdrawal: one.withdrawal,
      balance: await getAvailableBalance(),
      message:
        `Refund submitted: UGX ${amount.toLocaleString()} will return to ` +
        `${one.phone || "the original payer"}.`,
    });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Refund failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
