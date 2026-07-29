"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Ticket,
  ExternalLink,
  Loader2,
  RefreshCw,
  Receipt,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, cn } from "@/lib/utils";
import { gatewayLabel } from "@/components/payments/official-receipt";

type MemberTicket = {
  id: string;
  ticketCode: string;
  receiptId: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventLocation?: string;
  eventDistrict?: string;
  eventStartDate?: string;
  eventType?: string;
  seats: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  status: string;
  paidAt: string;
};

function isUpcoming(start?: string) {
  if (!start) return true;
  const t = new Date(start).getTime();
  if (Number.isNaN(t)) return true;
  // still “upcoming” for 6 hours after start
  return t > Date.now() - 6 * 60 * 60 * 1000;
}

export default function MyEventsPage() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<MemberTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (user.email) params.set("userEmail", user.email);
      if (user.id) params.set("userId", user.id);
      const res = await fetch(`/api/events/tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tickets");
      setTickets((data.tickets || []) as MemberTicket[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your events");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  const filtered = useMemo(() => {
    if (tab === "all") return tickets;
    if (tab === "upcoming") {
      return tickets.filter((t) => isUpcoming(t.eventStartDate));
    }
    return tickets.filter((t) => !isUpcoming(t.eventStartDate));
  }, [tickets, tab]);

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Member portal
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            My events & tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Events you registered for or paid for — open the e-ticket anytime.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["upcoming", "Upcoming"],
            ["past", "Past"],
            ["all", "All"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {label}
            {id === "all" ? ` (${tickets.length})` : ""}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          Loading your tickets…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center space-y-3">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Ticket}
          title={
            tab === "upcoming"
              ? "No upcoming event tickets"
              : tab === "past"
                ? "No past event tickets yet"
                : "You have not registered for any events"
          }
          description="Browse events, complete free registration or payment, and your tickets will appear here with QR e-receipts."
          actionHref="/events"
          actionLabel="Browse events"
        />
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((t) => {
            const upcoming = isUpcoming(t.eventStartDate);
            const free =
              t.paymentMethod === "free" || Number(t.amountPaid) === 0;
            return (
              <li key={t.id}>
                <article className="rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-emerald-500/25 transition-colors">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                      <Ticket className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="font-bold text-base sm:text-lg leading-snug">
                            {t.eventTitle}
                          </h2>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {t.ticketCode}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={upcoming ? "success" : "secondary"}>
                            {upcoming ? "Upcoming" : "Past"}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {t.status || "confirmed"}
                          </Badge>
                          {free ? (
                            <Badge variant="info">Free</Badge>
                          ) : (
                            <Badge variant="secondary">Paid</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                          {t.eventStartDate
                            ? formatDate(t.eventStartDate, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Date on ticket"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                          {t.eventLocation ||
                            t.eventDistrict ||
                            (t.eventType === "online" ? "Online" : "See event")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                          {t.seats} seat{t.seats === 1 ? "" : "s"}
                        </span>
                      </div>

                      <p className="text-sm">
                        <span className="text-muted-foreground">Paid: </span>
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {t.currency} {Number(t.amountPaid).toLocaleString()}
                        </strong>
                        <span className="text-muted-foreground">
                          {" "}
                          ·{" "}
                          {free
                            ? "Free registration"
                            : gatewayLabel(t.paymentMethod)}
                        </span>
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link href={`/tickets/${t.id}`}>
                          <Button size="sm">
                            <Receipt className="h-4 w-4" />
                            Open e-ticket / receipt
                          </Button>
                        </Link>
                        {t.eventSlug && (
                          <Link href={`/events/${t.eventSlug}`}>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-4 w-4" />
                              Event page
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        Looking for more?{" "}
        <Link href="/events" className="text-emerald-600 font-semibold hover:underline">
          Browse all events
        </Link>{" "}
        or manage your{" "}
        <Link
          href="/dashboard/membership"
          className="text-emerald-600 font-semibold hover:underline"
        >
          membership card
        </Link>
        .
      </div>
    </div>
  );
}
