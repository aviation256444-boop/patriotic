import { NextResponse } from "next/server";
import { getCollection, upsertItem } from "@/lib/cms/store";
import { getRequestToPayStatus } from "@/lib/momo/collections";
import { getAirtelPaymentStatus } from "@/lib/airtel/collections";
import { getDepositStatus, toCheckoutStatus } from "@/lib/pawapay/deposits";
import type { CmsDonation } from "@/lib/cms/types";
import { isPaymentDemoAllowed } from "@/lib/payments/demo";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  momoReferenceId?: string;
  airtelTransactionId?: string;
  pawapayDepositId?: string | null;
  paymentProvider?: string;
  externalId?: string;
  paymentMethod?: string;
  demoMode?: boolean;
  liveCharge?: boolean;
  financialTransactionId?: string;
};

/**
 * Finalize payment.
 * Live MTN MoMo: only marks completed when Collections status is SUCCESSFUL
 * (real wallet charge after donor enters PIN on phone).
 * Demo / other gateways: allow client-driven complete for testing.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paymentId = String(body.paymentId || "");
    const externalId = String(body.externalId || "");
    const statusIn = String(body.status || "completed").toLowerCase();
    const providerRef = body.providerRef ? String(body.providerRef) : "";
    const pin = body.pin ? String(body.pin) : "";
    // cardNumber reserved for future card validation on confirm
    void (body.cardNumber ? String(body.cardNumber).replace(/\s/g, "") : "");

    const donations = (await getCollection("donations")) as DonationRow[];

    const donation =
      donations.find((d) => d.id === paymentId) ||
      donations.find((d) => d.externalId === externalId);

    if (!donation) {
      return NextResponse.json({ error: "Payment not found. Start checkout again." }, { status: 404 });
    }

    const gateway = donation.paymentMethod || body.gateway || "mtn_momo";
    const provider =
      donation.paymentProvider ||
      (donation.meta && typeof donation.meta === "object"
        ? String((donation.meta as { provider?: string }).provider || "")
        : "") ||
      "";
    const ref =
      providerRef ||
      donation.pawapayDepositId ||
      donation.airtelTransactionId ||
      donation.momoReferenceId ||
      "";
    const isPawaPay =
      provider === "pawapay" ||
      Boolean(donation.pawapayDepositId) ||
      (Boolean(donation.liveCharge) &&
        Boolean(ref) &&
        /^[0-9a-f-]{36}$/i.test(String(ref)) &&
        (gateway === "mtn_momo" || gateway === "airtel_money") &&
        !String(ref).startsWith("MOMO-DEMO") &&
        !String(ref).startsWith("AIRTEL-DEMO") &&
        provider !== "momo" &&
        provider !== "airtel");

    // ── Live PawaPay: poll deposit status (works on localhost) ───────
    if (
      isPawaPay &&
      (body.poll || donation.liveCharge) &&
      ref &&
      !donation.demoMode
    ) {
      const poll = await getDepositStatus(ref);
      const mapped = toCheckoutStatus(poll.status);

      if (mapped === "SUCCESSFUL") {
        const mmoRef =
          poll.correspondentIds &&
          Object.values(poll.correspondentIds).find(Boolean);
        const updated = await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            status: "completed",
            pawapayDepositId: ref,
            momoReferenceId: ref,
            paymentReference: mmoRef || ref,
            financialTransactionId: mmoRef || ref,
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          "checkout-confirm"
        );
        return NextResponse.json({
          success: true,
          status: "completed",
          live: true,
          provider: "pawapay",
          pawaPayStatus: poll.status,
          donation: updated,
          receipt: receipt(donation, gateway, "completed"),
        });
      }

      if (mapped === "FAILED") {
        const updated = await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            status: "failed",
            pawapayDepositId: ref,
            failureReason: poll.reason || poll.error || "FAILED",
            updatedAt: new Date().toISOString(),
          },
          "checkout-confirm"
        );
        return NextResponse.json({
          success: false,
          status: "failed",
          live: true,
          provider: "pawapay",
          pawaPayStatus: poll.status,
          reason: poll.reason || poll.error,
          donation: updated,
          error: poll.reason || "Payment was declined or failed on PawaPay",
        });
      }

      return NextResponse.json({
        success: true,
        status: "pending",
        live: true,
        provider: "pawapay",
        pawaPayStatus: poll.status,
        message:
          "Waiting for you to approve on your phone with your mobile money PIN…",
        error: poll.error,
      });
    }

    const isLiveMomo =
      !isPawaPay &&
      gateway === "mtn_momo" &&
      Boolean(donation.liveCharge) &&
      Boolean(ref) &&
      !String(ref).startsWith("MOMO-DEMO");
    const isLiveAirtel =
      !isPawaPay &&
      gateway === "airtel_money" &&
      Boolean(donation.liveCharge) &&
      Boolean(ref) &&
      !String(ref).startsWith("AIRTEL-DEMO");

    // ── Live Airtel: Airtel is source of truth ────────────────────────
    if (
      isLiveAirtel ||
      (gateway === "airtel_money" && body.poll && ref && !donation.demoMode && !isPawaPay)
    ) {
      const poll = await getAirtelPaymentStatus(ref);

      if (poll.status === "SUCCESSFUL") {
        const updated = await upsertItem(
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
          "checkout-confirm"
        );
        return NextResponse.json({
          success: true,
          status: "completed",
          live: true,
          airtelStatus: poll.status,
          donation: updated,
          receipt: receipt(donation, gateway, "completed"),
        });
      }

      if (poll.status === "FAILED") {
        const updated = await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            status: "failed",
            airtelTransactionId: ref,
            failureReason: poll.message || poll.error || "FAILED",
            updatedAt: new Date().toISOString(),
          },
          "checkout-confirm"
        );
        return NextResponse.json({
          success: false,
          status: "failed",
          live: true,
          airtelStatus: poll.status,
          reason: poll.message || poll.error,
          donation: updated,
          error: poll.message || "Payment was declined or failed on Airtel Money",
        });
      }

      if (poll.status === "PENDING") {
        return NextResponse.json({
          success: true,
          status: "pending",
          live: true,
          airtelStatus: "PENDING",
          message: "Waiting for you to approve on your phone with Airtel Money PIN…",
        });
      }

      return NextResponse.json({
        success: false,
        status: "pending",
        live: true,
        airtelStatus: poll.status,
        error: poll.error || "Could not verify payment with Airtel yet",
      });
    }

    // ── Live MTN: MTN is source of truth ──────────────────────────────
    if (isLiveMomo || (gateway === "mtn_momo" && body.poll && ref && !donation.demoMode)) {
      const poll = await getRequestToPayStatus(ref);

      if (poll.status === "SUCCESSFUL") {
        const updated = await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            status: "completed",
            momoReferenceId: ref,
            paymentReference: poll.financialTransactionId || ref,
            financialTransactionId: poll.financialTransactionId,
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          "checkout-confirm"
        );
        return NextResponse.json({
          success: true,
          status: "completed",
          live: true,
          momoStatus: poll.status,
          donation: updated,
          receipt: receipt(donation, gateway, "completed"),
        });
      }

      if (poll.status === "FAILED") {
        const updated = await upsertItem(
          "donations",
          {
            ...donation,
            id: donation.id,
            status: "failed",
            momoReferenceId: ref,
            failureReason: poll.reason || poll.error || "FAILED",
            updatedAt: new Date().toISOString(),
          },
          "checkout-confirm"
        );
        return NextResponse.json({
          success: false,
          status: "failed",
          live: true,
          momoStatus: poll.status,
          reason: poll.reason || poll.error,
          donation: updated,
          error: poll.reason || "Payment was declined or failed on MTN MoMo",
        });
      }

      if (poll.status === "PENDING") {
        return NextResponse.json({
          success: true,
          status: "pending",
          live: true,
          momoStatus: "PENDING",
          message: "Waiting for you to approve on your phone with MoMo PIN…",
        });
      }

      return NextResponse.json({
        success: false,
        status: "pending",
        live: true,
        momoStatus: poll.status,
        error: poll.error || "Could not verify payment with MTN yet",
      });
    }

    // ── Demo / card / bank ────────────────────────────────────────────
    // Production: never mark live mobile money as paid without provider SUCCESS
    const isMobileMoney = gateway === "mtn_momo" || gateway === "airtel_money";
    if (
      isMobileMoney &&
      !donation.demoMode &&
      donation.liveCharge &&
      (statusIn === "completed" || statusIn === "successful") &&
      !body.poll
    ) {
      return NextResponse.json(
        {
          error:
            "Live mobile money must be confirmed by PawaPay / network status, not the browser.",
          status: "pending",
        },
        { status: 400 }
      );
    }

    if (
      isMobileMoney &&
      (statusIn === "completed" || statusIn === "successful") &&
      !isPaymentDemoAllowed() &&
      (donation.demoMode || !donation.liveCharge)
    ) {
      return NextResponse.json(
        {
          error:
            "Demo payments are disabled on this server. Configure PAWAPAY_API_TOKEN for live charges.",
          code: "DEMO_DISABLED",
        },
        { status: 403 }
      );
    }

    if (statusIn === "completed" || statusIn === "successful") {
      if (isMobileMoney) {
        if (body.requirePin === true || (pin && pin.length > 0)) {
          if (!/^\d{4,5}$/.test(pin)) {
            return NextResponse.json(
              { error: "Enter a valid MoMo PIN (4 or 5 digits)" },
              { status: 400 }
            );
          }
        }
      }
    }

    let finalStatus: "completed" | "failed" | "pending" =
      statusIn === "failed" ? "failed" : statusIn === "pending" ? "pending" : "completed";

    if (statusIn === "completed" || statusIn === "successful") {
      finalStatus = "completed";
    }

    // Bank transfers stay pending unless admin later marks them completed
    if (gateway === "bank" && statusIn !== "failed") {
      finalStatus = "pending";
    }

    const updated = await upsertItem(
      "donations",
      {
        ...donation,
        id: donation.id,
        status: finalStatus,
        momoReferenceId: ref || donation.momoReferenceId || null,
        paymentReference: providerRef || donation.paymentReference || null,
        paidAt: finalStatus === "completed" ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      },
      "checkout-confirm"
    );

    if (finalStatus === "completed") {
      try {
        const { createNotification } = await import("@/lib/notifications/store");
        const email = String(donation.email || "").trim();
        if (email) {
          const purpose = String(donation.purpose || "payment");
          createNotification({
            sourceKey: `payment:${donation.id}`,
            audience: "user",
            userEmail: email,
            type: "payment",
            title:
              purpose === "donation"
                ? "Donation received — thank you"
                : "Payment confirmed",
            message: `${donation.currency || "UGX"} ${Number(donation.amount || 0).toLocaleString()} via ${gateway.replace(/_/g, " ")}. Ref ${donation.externalId || donation.id}.`,
            link:
              purpose === "donation"
                ? "/donate/success"
                : purpose === "event"
                  ? "/dashboard/events"
                  : "/dashboard",
          });
        }
      } catch {
        /* non-blocking */
      }
    }

    return NextResponse.json({
      success: true,
      status: finalStatus,
      live: false,
      donation: updated,
      receipt: receipt(donation, gateway, finalStatus),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Confirm failed" },
      { status: 500 }
    );
  }
}

function receipt(
  donation: DonationRow,
  gateway: string,
  status: string
) {
  return {
    paymentId: donation.id,
    externalId: donation.externalId,
    amount: donation.amount,
    currency: donation.currency,
    gateway,
    status,
    paidAt: status === "completed" ? new Date().toISOString() : null,
  };
}
