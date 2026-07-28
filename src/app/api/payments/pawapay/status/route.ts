import { NextResponse } from "next/server";
import { getDepositStatus, toCheckoutStatus } from "@/lib/pawapay/deposits";
import { getCollection, upsertItem } from "@/lib/cms/store";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  externalId?: string;
  momoReferenceId?: string | null;
  pawapayDepositId?: string | null;
  liveCharge?: boolean;
  financialTransactionId?: string;
  paymentProvider?: string;
};

/**
 * Poll PawaPay deposit status.
 * Works on localhost — server calls PawaPay API (no public callback required).
 *
 * GET ?depositId=... | ?referenceId=... | ?paymentId=... | ?externalId=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const depositIdParam =
      searchParams.get("depositId") ||
      searchParams.get("referenceId") ||
      searchParams.get("transactionId") ||
      "";
    const externalId = searchParams.get("externalId") || "";
    const paymentId = searchParams.get("paymentId") || "";

    const donations = (await getCollection("donations")) as DonationRow[];
    let donation: DonationRow | undefined;
    if (paymentId) donation = donations.find((d) => d.id === paymentId);
    if (!donation && externalId)
      donation = donations.find((d) => d.externalId === externalId);

    const depositId =
      depositIdParam ||
      donation?.pawapayDepositId ||
      donation?.momoReferenceId ||
      donation?.id ||
      "";

    if (!depositId) {
      return NextResponse.json(
        {
          error:
            "depositId, paymentId, or externalId with PawaPay deposit required",
        },
        { status: 400 }
      );
    }

    const result = await getDepositStatus(depositId);
    const mapped = toCheckoutStatus(result.status);
    let donationStatus = donation?.status || "pending";

    if (donation && mapped === "SUCCESSFUL" && donation.status !== "completed") {
      const mmoRef =
        result.correspondentIds &&
        Object.values(result.correspondentIds).find(Boolean);
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "completed",
          pawapayDepositId: depositId,
          momoReferenceId: depositId,
          paymentReference: mmoRef || depositId,
          financialTransactionId: mmoRef || depositId,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "pawapay-status-poll"
      );
      donationStatus = "completed";
    } else if (donation && mapped === "FAILED" && donation.status !== "failed") {
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "failed",
          pawapayDepositId: depositId,
          failureReason: result.reason || result.error,
          updatedAt: new Date().toISOString(),
        },
        "pawapay-status-poll"
      );
      donationStatus = "failed";
    }

    const uiStatus =
      mapped === "SUCCESSFUL"
        ? "SUCCESSFUL"
        : mapped === "FAILED"
          ? "FAILED"
          : "PENDING";

    return NextResponse.json(
      {
        status: uiStatus,
        pawaPayStatus: result.status,
        donationStatus,
        depositId,
        financialTransactionId:
          (result.correspondentIds &&
            Object.values(result.correspondentIds)[0]) ||
          undefined,
        reason: result.reason,
        error: result.error,
        paymentId: donation?.id,
        externalId: donation?.externalId,
        amount: donation?.amount,
        currency: donation?.currency || result.currency,
        depositedAmount: result.depositedAmount,
        raw: result.raw,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
