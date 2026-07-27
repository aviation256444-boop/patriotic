import { NextResponse } from "next/server";
import { getCollection, upsertItem } from "@/lib/cms/store";
import { getRequestToPayStatus } from "@/lib/momo/collections";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

/**
 * Confirms a payment after widget success event or polls RequestToPay status.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const externalId = body.externalId ? String(body.externalId) : "";
    const paymentId = body.paymentId ? String(body.paymentId) : "";
    const status = String(body.status || "completed").toLowerCase();
    const invoice = body.invoice && typeof body.invoice === "object" ? body.invoice : {};
    const referenceId = body.referenceId ? String(body.referenceId) : "";

    const donations = (await getCollection("donations")) as CmsDonation[];
    const donation =
      donations.find((d) => d.id === paymentId) ||
      donations.find((d) => (d as CmsDonation & { externalId?: string }).externalId === externalId);

    if (!donation && !externalId && !paymentId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Optional live status check for RequestToPay
    let polledStatus: string | undefined;
    const ref =
      referenceId ||
      (donation as CmsDonation & { momoReferenceId?: string })?.momoReferenceId ||
      "";
    if (ref && body.poll) {
      const poll = await getRequestToPayStatus(ref);
      polledStatus = poll.status;
    }

    const finalStatus =
      polledStatus === "SUCCESSFUL" || status === "completed" || status === "successful"
        ? "completed"
        : polledStatus === "FAILED" || status === "failed"
        ? "failed"
        : "pending";

    const updated = await upsertItem(
      "donations",
      {
        ...(donation || {}),
        id: donation?.id || paymentId || `pay-${Date.now()}`,
        amount: donation?.amount || Number(invoice.amount) || 0,
        currency: donation?.currency || invoice.currency || "UGX",
        donorName: donation?.donorName || "Donor",
        isAnonymous: donation?.isAnonymous ?? false,
        campaign: donation?.campaign || "general",
        status: finalStatus,
        externalId: externalId || (donation as { externalId?: string })?.externalId,
        momoReferenceId: ref || invoice.referenceId || null,
        invoiceId: invoice.invoiceId || null,
        paymentReference: invoice.paymentReference || null,
        momoRaw: invoice,
        updatedAt: new Date().toISOString(),
        createdAt: donation?.createdAt || new Date().toISOString(),
      },
      "momo-confirm"
    );

    return NextResponse.json({ success: true, donation: updated, status: finalStatus });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Confirm failed" },
      { status: 500 }
    );
  }
}
