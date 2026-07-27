import { NextResponse } from "next/server";
import { getRequestToPayStatus } from "@/lib/momo/collections";
import { getCollection, upsertItem } from "@/lib/cms/store";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  externalId?: string;
  momoReferenceId?: string;
  liveCharge?: boolean;
  financialTransactionId?: string;
};

/**
 * Poll MTN RequestToPay status.
 * When SUCCESSFUL, donation is marked completed (real charge confirmed).
 * GET ?referenceId=... | ?paymentId=... | ?externalId=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get("referenceId") || "";
    const externalId = searchParams.get("externalId") || "";
    const paymentId = searchParams.get("paymentId") || "";

    const donations = (await getCollection("donations")) as DonationRow[];
    let donation: DonationRow | undefined;
    if (paymentId) donation = donations.find((d) => d.id === paymentId);
    if (!donation && externalId) donation = donations.find((d) => d.externalId === externalId);

    const ref = referenceId || donation?.momoReferenceId || "";
    if (!ref) {
      return NextResponse.json(
        { error: "referenceId, paymentId, or externalId with MoMo ref required" },
        { status: 400 }
      );
    }

    const result = await getRequestToPayStatus(ref);
    let donationStatus = donation?.status || "pending";

    if (donation && result.status === "SUCCESSFUL" && donation.status !== "completed") {
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "completed",
          momoReferenceId: ref,
          paymentReference: result.financialTransactionId || ref,
          financialTransactionId: result.financialTransactionId,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "momo-status-poll"
      );
      donationStatus = "completed";
    } else if (donation && result.status === "FAILED" && donation.status !== "failed") {
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "failed",
          momoReferenceId: ref,
          failureReason: result.reason || result.error,
          updatedAt: new Date().toISOString(),
        },
        "momo-status-poll"
      );
      donationStatus = "failed";
    }

    return NextResponse.json(
      {
        status: result.status,
        donationStatus,
        financialTransactionId: result.financialTransactionId,
        reason: result.reason,
        error: result.error,
        referenceId: ref,
        paymentId: donation?.id,
        externalId: donation?.externalId,
        amount: donation?.amount,
        currency: donation?.currency,
        raw: result.raw,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
