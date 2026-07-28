import { NextResponse } from "next/server";
import { getCollection } from "@/lib/cms/store";
import { paymentStats } from "@/lib/tickets/store";
import type { CmsDonation } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type DonationRow = CmsDonation & {
  externalId?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  purpose?: string;
  phone?: string;
  paidAt?: string;
  liveCharge?: boolean;
  demoMode?: boolean;
  financialTransactionId?: string;
  pawapayDepositId?: string | null;
};

/**
 * Combined payments dashboard: donations + event ticket revenue.
 * GET /api/payments/summary
 */
export async function GET() {
  try {
    const donations = (await getCollection("donations")) as DonationRow[];
    const tickets = paymentStats();

    const completed = donations.filter((d) => d.status === "completed");
    const pending = donations.filter((d) => d.status === "pending");
    const failed = donations.filter((d) => d.status === "failed");

    const donationRevenue = completed.reduce(
      (sum, d) => sum + (Number(d.amount) || 0),
      0
    );

    const byMethod: Record<string, number> = {};
    for (const d of completed) {
      const key = d.paymentMethod || d.paymentProvider || "unknown";
      byMethod[key] = (byMethod[key] || 0) + (Number(d.amount) || 0);
    }
    for (const [method, amount] of Object.entries(tickets.byGateway || {})) {
      byMethod[method] = (byMethod[method] || 0) + amount;
    }

    const recentDonations = [...donations]
      .sort((a, b) => {
        const ta = new Date(a.paidAt || a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.paidAt || b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 40)
      .map((d) => ({
        id: d.id,
        externalId: d.externalId,
        amount: d.amount,
        currency: d.currency || "UGX",
        status: d.status,
        donorName: d.isAnonymous ? "Anonymous" : d.donorName,
        campaign: d.campaign,
        purpose: d.purpose || "donation",
        paymentMethod: d.paymentMethod,
        paymentProvider: d.paymentProvider,
        phone: d.phone,
        liveCharge: d.liveCharge,
        demoMode: d.demoMode,
        paidAt: d.paidAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));

    return NextResponse.json(
      {
        success: true,
        totals: {
          donationRevenue,
          ticketRevenue: tickets.totalRevenue || 0,
          totalRevenue: donationRevenue + (tickets.totalRevenue || 0),
          completedDonations: completed.length,
          pendingDonations: pending.length,
          failedDonations: failed.length,
          tickets: tickets.totalTickets || 0,
          seats: tickets.totalSeats || 0,
        },
        byMethod,
        ticketStats: tickets,
        recentDonations,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Summary failed" },
      { status: 500 }
    );
  }
}
