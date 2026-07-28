/**
 * App-side available balance for super-admin withdrawals.
 * Collected = completed live user payments (donations + ticket sales recorded as donations).
 * Available = collected − withdrawn/reserved.
 */

import { getCollection } from "@/lib/cms/store";
import { paymentStats } from "@/lib/tickets/store";
import {
  completedWithdrawalsTotal,
  totalWithdrawnOrReserved,
} from "@/lib/payments/withdrawals";
import type { CmsDonation } from "@/lib/cms/types";

type DonationRow = CmsDonation & {
  liveCharge?: boolean;
  demoMode?: boolean;
  demo?: boolean;
  purpose?: string;
  paymentProvider?: string;
};

export type BalanceSnapshot = {
  currency: string;
  /** Completed live payments in the app ledger */
  collected: number;
  /** Of which marked as donations/campaigns */
  fromDonations: number;
  /** Of which event ticket payments (purpose event or ticket stats) */
  fromTickets: number;
  /** Completed withdrawals only */
  withdrawn: number;
  /** Pending/processing/completed (reserved against balance) */
  reserved: number;
  /** Available to withdraw now */
  available: number;
  completedCount: number;
  pendingCount: number;
};

export async function getAvailableBalance(): Promise<BalanceSnapshot> {
  const donations = (await getCollection("donations")) as DonationRow[];
  const tickets = paymentStats();

  const completedLive = donations.filter((d) => {
    if (d.status !== "completed") return false;
    if (d.demoMode === true || d.demo === true) return false;
    // Prefer live charges; if unknown (legacy), count completed non-demo
    return true;
  });

  let fromDonations = 0;
  let fromEventPayments = 0;
  for (const d of completedLive) {
    const amt = Number(d.amount) || 0;
    const purpose = String(d.purpose || d.campaign || "").toLowerCase();
    if (purpose.includes("event") || purpose.startsWith("event:")) {
      fromEventPayments += amt;
    } else {
      fromDonations += amt;
    }
  }

  // Ticket store revenue as cross-check (paid seats after confirmed payment)
  const ticketRevenue = Number(tickets.totalRevenue) || 0;
  // Prefer donation ledger total for money that actually went through checkout
  const collected = completedLive.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  // If tickets exist without donation rows (edge), still include ticket revenue not already in ledger
  const collectedSafe = Math.max(collected, ticketRevenue);

  const withdrawn = completedWithdrawalsTotal();
  const reserved = totalWithdrawnOrReserved();
  const available = Math.max(0, collectedSafe - reserved);

  return {
    currency: "UGX",
    collected: collectedSafe,
    fromDonations,
    fromTickets: Math.max(fromEventPayments, ticketRevenue),
    withdrawn,
    reserved,
    available,
    completedCount: completedLive.length,
    pendingCount: donations.filter((d) => d.status === "pending").length,
  };
}
