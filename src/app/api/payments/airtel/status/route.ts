import { NextResponse } from "next/server";
import { getAirtelPaymentStatus } from "@/lib/airtel/collections";
import { getCollection, upsertItem } from "@/lib/cms/store";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  externalId?: string;
  momoReferenceId?: string;
  airtelTransactionId?: string;
  liveCharge?: boolean;
  paymentMethod?: string;
};

/**
 * Poll Airtel payment status.
 * GET ?transactionId=... | ?paymentId=... | ?externalId=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId") || searchParams.get("referenceId") || "";
    const externalId = searchParams.get("externalId") || "";
    const paymentId = searchParams.get("paymentId") || "";

    const donations = (await getCollection("donations")) as DonationRow[];
    let donation: DonationRow | undefined;
    if (paymentId) donation = donations.find((d) => d.id === paymentId);
    if (!donation && externalId) donation = donations.find((d) => d.externalId === externalId);

    const ref =
      transactionId ||
      donation?.airtelTransactionId ||
      donation?.momoReferenceId ||
      "";

    if (!ref) {
      return NextResponse.json(
        { error: "transactionId, paymentId, or externalId required" },
        { status: 400 }
      );
    }

    const result = await getAirtelPaymentStatus(ref);
    let donationStatus = donation?.status || "pending";

    if (donation && result.status === "SUCCESSFUL" && donation.status !== "completed") {
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "completed",
          airtelTransactionId: ref,
          momoReferenceId: ref,
          paymentReference: ref,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "airtel-status-poll"
      );
      donationStatus = "completed";
    } else if (donation && result.status === "FAILED" && donation.status !== "failed") {
      await upsertItem(
        "donations",
        {
          ...donation,
          id: donation.id,
          status: "failed",
          airtelTransactionId: ref,
          failureReason: result.message || result.error,
          updatedAt: new Date().toISOString(),
        },
        "airtel-status-poll"
      );
      donationStatus = "failed";
    }

    return NextResponse.json(
      {
        status: result.status,
        donationStatus,
        airtelCode: result.airtelCode,
        message: result.message,
        error: result.error,
        transactionId: ref,
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
    return NextResponse.json({ error: "Airtel status check failed" }, { status: 500 });
  }
}
