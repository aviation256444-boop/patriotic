"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Download, Home, Ticket } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type TicketRow = {
  id: string;
  ticketCode: string;
  receiptId: string;
  eventTitle: string;
  eventSlug: string;
  userName: string;
  userEmail: string;
  seats: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
  status: string;
};

export default function TicketReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/events/tickets/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ticket) setTicket(d.ticket);
        else setError(d.error || "Ticket not found");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load ticket");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <PageHero
        badge="E-receipt · Ticket"
        title="Your event ticket"
        description="Present this receipt and QR code at the venue. Issued only after payment was confirmed."
      />
      <section className="py-12">
        <div className="mx-auto max-w-lg px-4">
          {loading && <Skeleton className="h-80 w-full rounded-2xl" />}
          {error && !loading && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center space-y-3">
              <p className="font-semibold text-red-600">{error}</p>
              <Link href="/events">
                <Button variant="outline">Browse events</Button>
              </Link>
            </div>
          )}
          {ticket && (
            <div className="rounded-3xl border border-emerald-500/30 bg-card p-6 sm:p-8 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  Payment confirmed
                </div>
                <Badge variant="success">{ticket.status}</Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Event</p>
                <h1 className="text-xl font-bold mt-0.5">{ticket.eventTitle}</h1>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Seats</p>
                  <p className="font-bold text-lg">{ticket.seats}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Amount paid</p>
                  <p className="font-bold text-lg text-emerald-600">
                    {ticket.currency} {ticket.amountPaid.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 p-4 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <strong>{ticket.userName}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span> {ticket.userEmail}
                </p>
                <p className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">Receipt ID:</span> {ticket.receiptId}
                </p>
                <p className="font-mono text-xs break-all">
                  <span className="text-muted-foreground">Ticket code:</span> {ticket.ticketCode}
                </p>
                <p className="text-xs text-muted-foreground">
                  Paid via {ticket.paymentMethod.replace(/_/g, " ")} ·{" "}
                  {new Date(ticket.paidAt).toLocaleString()}
                </p>
              </div>

              <div className="flex justify-center bg-white rounded-2xl p-4 border border-border/40">
                <QRCodeSVG
                  value={`PYU-TICKET:${ticket.ticketCode}`}
                  size={180}
                  level="H"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                <Ticket className="inline h-3.5 w-3.5 mr-1" />
                Show this QR at check-in
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Download className="h-4 w-4" /> Print / save
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full" variant="ghost">
                    <Home className="h-4 w-4" /> Home
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
