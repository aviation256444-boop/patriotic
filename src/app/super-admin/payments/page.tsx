"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, RefreshCw, Ticket, Heart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DonationRow = {
  id: string;
  externalId?: string;
  amount: number;
  currency: string;
  status: string;
  donorName?: string;
  campaign?: string;
  purpose?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  phone?: string;
  liveCharge?: boolean;
  demoMode?: boolean;
  paidAt?: string;
  createdAt?: string;
};

type Summary = {
  totals: {
    donationRevenue: number;
    ticketRevenue: number;
    totalRevenue: number;
    completedDonations: number;
    pendingDonations: number;
    failedDonations: number;
    tickets: number;
    seats: number;
  };
  byMethod: Record<string, number>;
  ticketStats: {
    totalRevenue: number;
    totalSeats: number;
    totalTickets: number;
    byEvent: {
      eventId: string;
      eventTitle: string;
      seats: number;
      revenue: number;
      tickets: number;
    }[];
    recent: Array<{
      id: string;
      ticketCode: string;
      receiptId: string;
      eventTitle: string;
      userName: string;
      userEmail: string;
      seats: number;
      amountPaid: number;
      currency: string;
      paymentMethod: string;
      paidAt: string;
      status: string;
    }>;
  };
  recentDonations: DonationRow[];
};

function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-emerald-600 text-white border-0">Paid</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-600 text-white border-0">Failed</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export default function SuperAdminPaymentsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/summary", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setSummary(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const t = summary?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Donations (PawaPay / card) and confirmed event tickets. Only completed charges count
            as revenue.
          </p>
        </div>
        <Button variant="outline" loading={loading} onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" /> Total collected
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            UGX {(t?.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> Donations
          </p>
          <p className="text-2xl font-black mt-1">
            UGX {(t?.donationRevenue || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t?.completedDonations || 0} paid · {t?.pendingDonations || 0} pending ·{" "}
            {t?.failedDonations || 0} failed
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Ticket className="h-3.5 w-3.5" /> Event tickets
          </p>
          <p className="text-2xl font-black mt-1">
            UGX {(t?.ticketRevenue || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t?.tickets || 0} tickets · {t?.seats || 0} seats
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Methods</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {summary?.byMethod && Object.keys(summary.byMethod).length > 0 ? (
              Object.entries(summary.byMethod).map(([method, amount]) => (
                <Badge key={method} variant="outline" className="text-xs">
                  {method.replace(/_/g, " ")}: {(amount as number).toLocaleString()}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No completed payments yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 font-bold flex items-center gap-2">
          <Heart className="h-4 w-4 text-[#ED1C24]" /> Recent donations &amp; mobile money
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2">Ref</th>
                <th className="px-4 py-2">Donor</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.recentDonations || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No donations yet — try /donate with Airtel or MTN
                  </td>
                </tr>
              )}
              {(summary?.recentDonations || []).map((d) => (
                <tr key={d.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{d.externalId || d.id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">{d.campaign || d.purpose}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.donorName || "—"}</p>
                    {d.phone && (
                      <p className="text-xs text-muted-foreground font-mono">{d.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {d.currency} {Number(d.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(d.paymentMethod || d.paymentProvider || "—").replace(/_/g, " ")}
                    {d.liveCharge && (
                      <span className="block text-[10px] text-emerald-600">Live charge</span>
                    )}
                    {d.demoMode && (
                      <span className="block text-[10px] text-amber-600">Demo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(d.status)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {d.paidAt || d.createdAt
                      ? new Date(d.paidAt || d.createdAt || "").toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(summary?.ticketStats?.byEvent || []).length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 font-bold">By event</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Tickets</th>
                  <th className="px-4 py-2">Seats</th>
                  <th className="px-4 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.ticketStats?.byEvent || []).map((e) => (
                  <tr key={e.eventId} className="border-t border-border/40">
                    <td className="px-4 py-3 font-medium">{e.eventTitle}</td>
                    <td className="px-4 py-3">{e.tickets}</td>
                    <td className="px-4 py-3">{e.seats}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">
                      UGX {e.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 font-bold flex items-center gap-2">
          <Ticket className="h-4 w-4" /> Recent tickets &amp; e-receipts
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2">Receipt</th>
                <th className="px-4 py-2">Buyer</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Seats</th>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.ticketStats?.recent || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No confirmed event payments yet
                  </td>
                </tr>
              )}
              {(summary?.ticketStats?.recent || []).map((row) => (
                <tr key={row.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${row.id}`}
                      className="font-mono text-xs text-emerald-600 hover:underline"
                    >
                      {row.receiptId}
                    </Link>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {row.ticketCode}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.userName}</p>
                    <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">{row.eventTitle}</td>
                  <td className="px-4 py-3">{row.seats}</td>
                  <td className="px-4 py-3 font-semibold">
                    {row.currency} {row.amountPaid.toLocaleString()}
                    <p className="text-[10px] text-muted-foreground">
                      {row.paymentMethod.replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(row.paidAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">PawaPay callback:</strong>{" "}
          https://patriotic-app.onrender.com/api/payments/pawapay/callback
        </p>
        <p>
          Paste that URL in the live PawaPay dashboard for Deposits (status is also polled from the
          app). Free Render disk can reset donation history on major redeploys.
        </p>
      </div>
    </div>
  );
}
