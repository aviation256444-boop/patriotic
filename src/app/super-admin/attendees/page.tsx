"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  RefreshCw,
  Search,
  Ban,
  ExternalLink,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, cn } from "@/lib/utils";

type AttendeeTicket = {
  id: string;
  ticketCode: string;
  receiptId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventStartDate?: string;
  eventLocation?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  seats: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  status: string;
  paidAt: string;
  revokeReason?: string;
  revokedAt?: string;
};

export default function SuperAdminAttendeesPage() {
  const user = useAuthStore((s) => s.user);
  const [tickets, setTickets] = useState<AttendeeTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "cancelled">("all");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events/tickets?admin=1&includeCancelled=1", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load attendees");
      setTickets((data.tickets || []) as AttendeeTicket[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tickets) {
      map.set(t.eventId || t.eventSlug, t.eventTitle);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (eventFilter !== "all") {
        const key = t.eventId || t.eventSlug;
        if (key !== eventFilter) return false;
      }
      if (!q) return true;
      return (
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.ticketCode.toLowerCase().includes(q) ||
        t.eventTitle.toLowerCase().includes(q) ||
        (t.userPhone || "").includes(q)
      );
    });
  }, [tickets, query, eventFilter, statusFilter]);

  const confirmedCount = tickets.filter((t) => t.status === "confirmed").length;
  const cancelledCount = tickets.filter((t) => t.status === "cancelled").length;
  const seatsConfirmed = tickets
    .filter((t) => t.status === "confirmed")
    .reduce((s, t) => s + (t.seats || 0), 0);

  const revoke = async (t: AttendeeTicket) => {
    if (!user) return;
    if (t.status === "cancelled") {
      toast.message("Already revoked");
      return;
    }
    const reason = window.prompt(
      `Revoke attendance for ${t.userName}?\n\nTicket ${t.ticketCode} · ${t.seats} seat(s)\nEvent: ${t.eventTitle}\n\nOptional reason:`,
      "Revoked by super admin"
    );
    if (reason === null) return;

    const ok = window.confirm(
      `Confirm revoke for ${t.userEmail}?\n\nThis cancels their ticket and frees seats.\nIt does NOT automatically refund money — use Finance → Refund if needed.`
    );
    if (!ok) return;

    setRevokingId(t.id);
    try {
      const res = await fetch(`/api/events/tickets/${encodeURIComponent(t.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: user.id,
          actorEmail: user.email,
          reason: reason || "Revoked by super admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      toast.success(data.message || "Attendance revoked");
      setTickets((prev) =>
        prev.map((x) =>
          x.id === t.id
            ? {
                ...x,
                status: "cancelled",
                revokeReason: reason || undefined,
                revokedAt: new Date().toISOString(),
              }
            : x
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            Event attendees
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everyone who registered or paid for events. Super Admin can revoke attendance
            (cancels ticket; refund money separately under Finance).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/super-admin/payments">
            <Button variant="outline">Finance dashboard</Button>
          </Link>
          <Button variant="outline" loading={loading} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Active tickets</p>
          <p className="text-2xl font-black text-emerald-600">{confirmedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Seats held</p>
          <p className="text-2xl font-black">{seatsConfirmed}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Revoked</p>
          <p className="text-2xl font-black text-red-600">{cancelledCount}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">All records</p>
          <p className="text-2xl font-black">{tickets.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name, email, phone, ticket, event…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <select
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm min-w-[10rem]"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="all">All events</option>
          {eventOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm min-w-[8rem]"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "confirmed" | "cancelled")
          }
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Revoked</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-muted-foreground text-sm gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Loading attendees…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={Ticket}
          title="No attendees found"
          description="When people register or pay for events, they appear here. Try clearing filters."
          actionHref="/super-admin/events"
          actionLabel="Manage events"
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Attendee</th>
                  <th className="px-4 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Ticket</th>
                  <th className="px-4 py-3 font-semibold">Seats / paid</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className={cn(
                      "align-top",
                      t.status === "cancelled" && "bg-red-500/5 opacity-90"
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold">{t.userName}</p>
                      <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                      {t.userPhone && (
                        <p className="text-xs text-muted-foreground">{t.userPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium leading-snug max-w-[14rem]">
                        {t.eventTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.eventStartDate
                          ? formatDate(t.eventStartDate, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs">{t.ticketCode}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {t.receiptId}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{t.seats} seat{t.seats === 1 ? "" : "s"}</p>
                      <p className="text-xs text-emerald-600 font-semibold">
                        {t.currency} {Number(t.amountPaid).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {t.paymentMethod?.replace(/_/g, " ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === "confirmed" ? (
                        <Badge className="bg-emerald-600 text-white border-0">
                          Confirmed
                        </Badge>
                      ) : t.status === "cancelled" ? (
                        <div className="space-y-1">
                          <Badge className="bg-red-600 text-white border-0">
                            Revoked
                          </Badge>
                          {t.revokeReason && (
                            <p className="text-[10px] text-muted-foreground max-w-[10rem]">
                              {t.revokeReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">{t.status}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-y-1.5">
                      <div className="flex flex-col items-end gap-1.5">
                        <Link href={`/tickets/${t.id}`}>
                          <Button size="sm" variant="outline" className="h-8">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ticket
                          </Button>
                        </Link>
                        {t.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-red-500/40 text-red-600 hover:bg-red-500/10"
                            loading={revokingId === t.id}
                            onClick={() => void revoke(t)}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
