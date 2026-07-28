"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, RefreshCw, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Stats = {
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
  byGateway: Record<string, number>;
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

export default function SuperAdminPaymentsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events/tickets?stats=1", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setStats(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            Event payments & tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue and seats from confirmed payments only. Tickets are issued after payment
            succeeds.
          </p>
        </div>
        <Button variant="outline" loading={loading} onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total collected</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            UGX {(stats?.totalRevenue || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Tickets issued</p>
          <p className="text-2xl font-black mt-1">{stats?.totalTickets || 0}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Seats booked</p>
          <p className="text-2xl font-black mt-1">{stats?.totalSeats || 0}</p>
        </div>
      </div>

      {stats?.byGateway && Object.keys(stats.byGateway).length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h2 className="font-bold mb-3">By payment method</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byGateway).map(([method, amount]) => (
              <Badge key={method} variant="outline" className="text-sm py-1.5 px-3">
                {method.replace(/_/g, " ")}: UGX {amount.toLocaleString()}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {stats?.byEvent && stats.byEvent.length > 0 && (
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
                {stats.byEvent.map((e) => (
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
          <Ticket className="h-4 w-4" /> Recent tickets & e-receipts
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
              {(stats?.recent || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No confirmed event payments yet
                  </td>
                </tr>
              )}
              {(stats?.recent || []).map((t) => (
                <tr key={t.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="font-mono text-xs text-emerald-600 hover:underline"
                    >
                      {t.receiptId}
                    </Link>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {t.ticketCode}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.userName}</p>
                    <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">{t.eventTitle}</td>
                  <td className="px-4 py-3">{t.seats}</td>
                  <td className="px-4 py-3 font-semibold">
                    {t.currency} {t.amountPaid.toLocaleString()}
                    <p className="text-[10px] text-muted-foreground">
                      {t.paymentMethod.replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(t.paidAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="h-3.5 w-3.5" />
        Event prices & capacity are set under Super Admin → Events.
      </p>
    </div>
  );
}
