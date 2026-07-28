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
  paymentProvider?: string;
  liveCharge?: boolean;
  demoMode?: boolean;
  refundId?: string | null;
  refundStatus?: string;
  refundedAmount?: number;
  paidAt?: string;
  externalId?: string;
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
  const na = normalizePawaPayMsisdn(String(a));
  const nb = normalizePawaPayMsisdn(String(b));
  if (na.length >= 11 && nb.length >= 11 && na === nb) return true;
  const ta = na.replace(/\D/g, "").slice(-9);
  const tb = nb.replace(/\D/g, "").slice(-9);
  return ta.length >= 9 && ta === tb;
}

function extractDepositId(d: DonationRow): string | null {
  const candidates = [
    d.pawapayDepositId,
    d.momoReferenceId,
    d.id,
    // sometimes stored only as provider ref strings
  ];
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
      return s;
    }
  }
  return null;
}

/**
 * Soft filter — we still try PawaPay even for edge cases.
 * Only skip rows that are clearly already fully refunded locally.
 */
function isCandidate(d: DonationRow): boolean {
  if (d.refundStatus === "completed") return false;
  // Prefer completed / paid; still allow pending live charges (PawaPay may reject)
  if (d.status === "failed" && d.refundStatus !== "failed") return false;
  return Boolean(extractDepositId(d));
}

function toRow(d: DonationRow) {
  return {
    id: d.id,
    externalId: d.externalId,
    amount: d.amount,
    currency: d.currency || "UGX",
    donorName: d.isAnonymous ? "Anonymous" : d.donorName,
    phone: d.phone,
    paymentMethod: d.paymentMethod,
    depositId: extractDepositId(d),
    paidAt: d.paidAt || d.createdAt,
    campaign: d.campaign,
    purpose: d.purpose,
    status: d.status,
    demoMode: d.demoMode,
    liveCharge: d.liveCharge,
    refundStatus: d.refundStatus || null,
  };
}

async function sendRefundToPawaPay(opts: {
  depositId: string;
  amount?: number;
  fullRefund?: boolean;
  gateway?: "mtn_momo" | "airtel_money" | "auto";
  phone?: string;
  paymentId?: string;
  actor: { id: string; email: string; fullName: string };
  note?: string;
  donation?: DonationRow | null;
}) {
  const {
    depositId,
    amount,
    fullRefund,
    gateway,
    phone,
    paymentId,
    actor,
    note,
    donation,
  } = opts;

  const refundId = randomUUID();
  const result = await initiateRefund({
    refundId,
    depositId,
    amount: fullRefund ? undefined : amount,
    fullRefund: fullRefund || amount == null,
    gateway: gateway || "auto",
    metadata: [
      { fieldName: "type", fieldValue: "manual_refund" },
      {
        fieldName: "actor",
        fieldValue: actor.email.slice(0, 64),
        isPII: true,
      },
      ...(paymentId
        ? [{ fieldName: "paymentId", fieldValue: paymentId.slice(0, 64) }]
        : []),
    ],
  });

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error || "PawaPay rejected the refund",
      code: result.rejectionCode || "REFUND_FAILED",
      depositId,
      raw: result.raw,
    };
  }

  const recordedAmount =
    amount && amount > 0
      ? amount
      : donation
        ? Math.round(Number(donation.amount) || 0)
        : amount || 0;

  const gw = (
    donation?.paymentMethod === "mtn_momo"
      ? "mtn_momo"
      : donation?.paymentMethod === "airtel_money"
        ? "airtel_money"
        : gateway === "mtn_momo"
          ? "mtn_momo"
          : "airtel_money"
  ) as "mtn_momo" | "airtel_money";

  const row = createWithdrawal({
    payoutId: result.refundId || refundId,
    amount: recordedAmount || 0,
    currency: donation?.currency || "UGX",
    gateway: gw,
    phone: phone || donation?.phone || "",
    msisdn: phone
      ? normalizePawaPayMsisdn(phone)
      : donation?.phone
        ? normalizePawaPayMsisdn(donation.phone)
        : "",
    status: "processing",
    providerStatus: result.status,
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.fullName,
    note: note || `Refund deposit ${depositId.slice(0, 8)}…`,
    live: true,
    method: "refund",
    depositId,
    paymentId: paymentId || donation?.id,
  });

  if (donation) {
    await upsertItem(
      "donations",
      {
        ...donation,
        id: donation.id,
        refundId: result.refundId || refundId,
        refundStatus: "processing",
        refundedAmount: recordedAmount || donation.amount,
        updatedAt: new Date().toISOString(),
      },
      actor.email
    );
  }

  try {
    const st = await getRefundStatus(row.payoutId);
    if (st.status === "SUCCESSFUL") {
      updateWithdrawal(row.id, { status: "completed", providerStatus: "COMPLETED" });
      if (donation) {
        await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            refundId: row.payoutId,
            refundStatus: "completed",
            refundedAmount: recordedAmount || donation.amount,
            updatedAt: new Date().toISOString(),
          },
          actor.email
        );
      }
    } else if (st.status === "FAILED") {
      updateWithdrawal(row.id, {
        status: "failed",
        providerStatus: "FAILED",
        failureReason: st.reason || st.error,
      });
      if (donation) {
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
    }
  } catch {
    /* leave processing — callback/poll later */
  }

  logActivity({
    kind: "payment",
    action: `Refund via PawaPay deposit ${depositId} → ${phone || donation?.phone || "original payer"}`,
    actor: actor.email,
    target: row.payoutId,
    meta: {
      depositId,
      amount: recordedAmount,
      phone,
      method: "refund",
      fullRefund: Boolean(fullRefund || !amount),
    },
  });

  return {
    ok: true as const,
    withdrawal: updateWithdrawal(row.id, {}) || row,
    depositId,
    refundId: result.refundId || refundId,
    pawaPayStatus: result.status,
  };
}

/**
 * GET — list candidates + optional phone filter
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
    let list = donations.filter(isCandidate).map(toRow);

    if (phoneFilter.trim()) {
      list = list.filter((d) => phonesMatch(d.phone, phoneFilter));
    }

    list = list
      .sort((a, b) => {
        return (
          new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime()
        );
      })
      .slice(0, 100);

    const matchTotal = list
      .filter((d) => d.status === "completed")
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);

    return NextResponse.json(
      {
        success: true,
        note:
          "Enter phone and/or deposit ID. We send the refund to PawaPay — they decide if the deposit is eligible. Money always returns to the original payer of that deposit.",
        refundable: list,
        count: list.length,
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
 * POST — manual refund (PawaPay decides eligibility)
 *
 * Body options:
 *  1) { mode: "manual", phone, amount?, fullRefund?, depositId?, note? }
 *  2) { depositId, amount?, fullRefund?, phone?, note? }  // direct — no local match required
 *  3) { paymentId, amount?, note? }
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

    const phoneIn = body.phone ? String(body.phone).replace(/\s/g, "") : "";
    const depositIdIn = body.depositId
      ? String(body.depositId).trim()
      : body.deposit_id
        ? String(body.deposit_id).trim()
        : "";
    const paymentId = String(body.paymentId || body.donationId || "").trim();
    const externalId = body.externalId ? String(body.externalId).trim() : "";
    const amountHint =
      body.amount != null && String(body.amount) !== ""
        ? Math.round(Number(body.amount))
        : undefined;
    const fullRefund =
      body.fullRefund === true ||
      body.fullRefund === "true" ||
      amountHint == null ||
      amountHint <= 0;
    const note = body.note ? String(body.note).slice(0, 160) : undefined;
    const gatewayHint = String(body.gateway || "auto") as
      | "mtn_momo"
      | "airtel_money"
      | "auto";

    const actorInfo = {
      id: actor.id,
      email: actor.email,
      fullName: actor.fullName,
    };

    const donations = (await getCollection("donations")) as DonationRow[];

    // ── Path A: explicit depositId — send straight to PawaPay ────────
    if (
      depositIdIn &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        depositIdIn
      )
    ) {
      const donation =
        donations.find((d) => extractDepositId(d) === depositIdIn) ||
        donations.find((d) => d.id === depositIdIn) ||
        null;

      const result = await sendRefundToPawaPay({
        depositId: depositIdIn,
        amount: fullRefund ? undefined : amountHint,
        fullRefund,
        gateway:
          donation?.paymentMethod === "mtn_momo"
            ? "mtn_momo"
            : donation?.paymentMethod === "airtel_money"
              ? "airtel_money"
              : gatewayHint,
        phone: phoneIn || donation?.phone || undefined,
        paymentId: donation?.id,
        actor: actorInfo,
        note: note || `Direct refund deposit ${depositIdIn}`,
        donation,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            code: result.code,
            depositId: depositIdIn,
            hint: "PawaPay rejected this refund. Common reasons: deposit not completed, already refunded, or wrong deposit ID.",
            pawaPay: result.raw,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: "depositId",
        depositId: depositIdIn,
        withdrawal: result.withdrawal,
        pawaPayStatus: result.pawaPayStatus,
        balance: await getAvailableBalance(),
        message: fullRefund
          ? `Full refund submitted to PawaPay for deposit ${depositIdIn.slice(0, 8)}…. They will pay the original payer if eligible.`
          : `Partial refund of UGX ${amountHint?.toLocaleString()} submitted to PawaPay for that deposit.`,
      });
    }

    // ── Path B: paymentId / externalId ───────────────────────────────
    if (paymentId || externalId) {
      const donation =
        donations.find((d) => d.id === paymentId) ||
        donations.find((d) => d.externalId === paymentId) ||
        donations.find((d) => d.externalId === externalId) ||
        null;

      if (!donation) {
        return NextResponse.json(
          {
            error:
              "Payment not found in app records. Paste the PawaPay deposit UUID (from receipt or dashboard) and try again — we will send it straight to PawaPay.",
            code: "PAYMENT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      const depositId = extractDepositId(donation);
      if (!depositId) {
        return NextResponse.json(
          {
            error:
              "This payment has no PawaPay deposit UUID. Open PawaPay dashboard → Deposits, copy the deposit ID, and paste it in the form.",
            code: "NO_DEPOSIT_ID",
          },
          { status: 400 }
        );
      }

      const result = await sendRefundToPawaPay({
        depositId,
        amount: fullRefund ? undefined : amountHint,
        fullRefund,
        gateway:
          donation.paymentMethod === "mtn_momo" ? "mtn_momo" : "airtel_money",
        phone: phoneIn || donation.phone || undefined,
        paymentId: donation.id,
        actor: actorInfo,
        note,
        donation,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            code: result.code,
            depositId,
            pawaPay: result.raw,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: "paymentId",
        withdrawal: result.withdrawal,
        balance: await getAvailableBalance(),
        message: `Refund submitted to PawaPay for payment ${donation.externalId || donation.id}.`,
      });
    }

    // ── Path C: phone only — try every matching deposit; PawaPay decides ──
    if (!phoneIn) {
      return NextResponse.json(
        {
          error:
            "Enter the payer phone number and/or the PawaPay deposit ID (UUID).",
          code: "PHONE_OR_DEPOSIT_REQUIRED",
        },
        { status: 400 }
      );
    }

    const msisdn = normalizePawaPayMsisdn(phoneIn);
    if (!msisdn || msisdn.length < 11) {
      return NextResponse.json(
        { error: "Invalid phone number (e.g. 0752 123 456)" },
        { status: 400 }
      );
    }

    // Include completed + pending live; do not hard-block demo — let PawaPay reject
    const matches = donations
      .filter((d) => phonesMatch(d.phone, phoneIn))
      .filter((d) => extractDepositId(d))
      .filter((d) => d.refundStatus !== "completed")
      .sort((a, b) => {
        // Prefer completed, then newest
        if (a.status === "completed" && b.status !== "completed") return -1;
        if (b.status === "completed" && a.status !== "completed") return 1;
        return (
          new Date(b.paidAt || b.createdAt || 0).getTime() -
          new Date(a.paidAt || a.createdAt || 0).getTime()
        );
      });

    if (matches.length === 0) {
      // Still allow if they only have depositId — already handled above
      const anyWithPhone = donations.filter((d) => phonesMatch(d.phone, phoneIn));
      return NextResponse.json(
        {
          error:
            anyWithPhone.length > 0
              ? `Found ${anyWithPhone.length} payment(s) for ${phoneIn}, but none have a PawaPay deposit UUID we can refund. Open PawaPay Deposits, copy the deposit ID, paste it below, and submit again.`
              : `No payments for ${phoneIn} in app records (records can reset on free hosting). Open PawaPay dashboard → Deposits, find your payment, copy deposit ID, paste it in the form — PawaPay will decide if a refund is allowed.`,
          code: "NO_LOCAL_MATCH",
          phone: phoneIn,
          msisdn,
          tip: "Use Deposit ID field for a direct PawaPay refund.",
        },
        { status: 404 }
      );
    }

    // Full refund of most recent matching completed deposit by default
    // If amount given: try deposits until PawaPay accepts enough, or one full deposit
    const attempts: Array<{
      depositId: string;
      paymentId: string;
      ok: boolean;
      error?: string;
      code?: string;
    }> = [];

    let remaining =
      !fullRefund && amountHint && amountHint > 0 ? amountHint : null;
    let successCount = 0;
    let lastWithdrawal: unknown = null;

    for (const donation of matches) {
      const depositId = extractDepositId(donation)!;

      // If targeting a total amount, take min(remaining, donation amount)
      let slice: number | undefined;
      let doFull = fullRefund || remaining == null;
      if (!doFull && remaining != null) {
        const max = Math.round(Number(donation.amount) || remaining);
        slice = Math.min(remaining, max);
        if (slice < 1) break;
        // If slice is essentially the full deposit, omit amount (cleaner for PawaPay)
        if (slice >= max) {
          doFull = true;
          slice = undefined;
        }
      }

      const result = await sendRefundToPawaPay({
        depositId,
        amount: doFull ? undefined : slice,
        fullRefund: doFull,
        gateway:
          donation.paymentMethod === "mtn_momo" ? "mtn_momo" : "airtel_money",
        phone: phoneIn,
        paymentId: donation.id,
        actor: actorInfo,
        note: note || `Manual refund to ${phoneIn}`,
        donation,
      });

      attempts.push({
        depositId,
        paymentId: donation.id,
        ok: result.ok,
        error: result.ok ? undefined : result.error,
        code: result.ok ? undefined : result.code,
      });

      if (result.ok) {
        successCount += 1;
        lastWithdrawal = result.withdrawal;
        if (remaining != null) {
          const took =
            slice || Math.round(Number(donation.amount) || 0) || remaining;
          remaining = Math.max(0, remaining - took);
          if (remaining < 500) break;
        } else {
          // One full deposit refund is enough when no amount specified
          break;
        }
      }
      // If PawaPay rejected, try next matching deposit (already refunded, not completed, etc.)
    }

    if (successCount === 0) {
      const lastErr =
        attempts.map((a) => a.error).filter(Boolean).pop() ||
        "PawaPay did not accept a refund for any matching payment";
      return NextResponse.json(
        {
          error: lastErr,
          code: "ALL_ATTEMPTS_FAILED",
          attempts,
          hint:
            "PawaPay decides eligibility. If every attempt failed, open dashboard.pawapay.io → Deposits, confirm the deposit is COMPLETED and not already refunded, then paste that deposit ID in the form.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: "phone",
      phone: phoneIn,
      msisdn,
      successCount,
      attempts,
      withdrawal: lastWithdrawal,
      balance: await getAvailableBalance(),
      message:
        successCount === 1
          ? `Refund submitted to PawaPay for ${phoneIn}. Money returns to that number if the deposit is eligible.`
          : `${successCount} refund(s) submitted to PawaPay for ${phoneIn}.`,
    });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Refund failed";
    const status = msg.toLowerCase().includes("super admin") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
