"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  OfficialReceipt,
  gatewayLabel,
} from "@/components/payments/official-receipt";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

type TicketRow = {
  id: string;
  ticketCode: string;
  receiptId: string;
  eventTitle: string;
  eventSlug: string;
  eventLocation?: string;
  eventDistrict?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventType?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  seats: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paymentExternalId?: string;
  paidAt: string;
  status: string;
};

function formatEventWhen(start?: string, end?: string) {
  if (!start) return "Date TBA";
  try {
    const s = formatDate(start, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!end) return s;
    return `${s}`;
  } catch {
    return start;
  }
}

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
    <section className="py-10 sm:py-14 print:py-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0">
        <div className="print-hide-hero no-print mb-8 text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Event ticket · Official e-receipt
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Your event ticket
          </h1>
          <p className="text-sm text-muted-foreground">
            One page · Show QR at the door · Print or save PDF
          </p>
        </div>

        {loading && <Skeleton className="h-[560px] w-full rounded-3xl" />}

        {error && !loading && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center space-y-3 max-w-lg mx-auto">
            <p className="font-semibold text-red-600">{error}</p>
            <Link href="/events">
              <Button variant="outline">Browse events</Button>
            </Link>
          </div>
        )}

        {ticket && (
          <OfficialReceipt
            kind="event"
            title={ticket.eventTitle}
            subtitle={`Event entry pass for ${ticket.userName}. Present this QR at check-in. Valid for the seats listed below.`}
            amount={Number(ticket.amountPaid)}
            currency={ticket.currency || "UGX"}
            method={
              ticket.paymentMethod === "free"
                ? "Free registration"
                : gatewayLabel(ticket.paymentMethod)
            }
            reference={ticket.receiptId}
            paidAt={ticket.paidAt}
            statusLabel={
              ticket.status === "confirmed" || ticket.status === "valid"
                ? "Ticket confirmed"
                : ticket.status || "Confirmed"
            }
            highlightRows={[
              {
                label: "Event date",
                value: formatEventWhen(ticket.eventStartDate, ticket.eventEndDate),
              },
              {
                label: "Venue",
                value:
                  ticket.eventLocation ||
                  ticket.eventDistrict ||
                  (ticket.eventType === "online" ? "Online event" : "See event page"),
              },
              {
                label: "Seats",
                value: `${ticket.seats} seat${ticket.seats === 1 ? "" : "s"}`,
              },
            ]}
            rows={[
              { label: "Guest name", value: ticket.userName },
              { label: "Email", value: ticket.userEmail },
              ...(ticket.userPhone
                ? [{ label: "Phone", value: ticket.userPhone }]
                : []),
              { label: "Ticket code", value: ticket.ticketCode },
              ...(ticket.eventType
                ? [{ label: "Format", value: ticket.eventType }]
                : []),
              ...(ticket.eventDistrict
                ? [{ label: "District", value: ticket.eventDistrict }]
                : []),
              ...(ticket.paymentExternalId
                ? [{ label: "Payment ref", value: ticket.paymentExternalId }]
                : []),
            ]}
            qrValue={`PYU-TICKET:${ticket.ticketCode}`}
            qrCaption="Scan at venue check-in · Official PYU event pass"
            secondaryHref={
              ticket.eventSlug ? `/events/${ticket.eventSlug}` : "/events"
            }
            secondaryLabel="Event details"
          />
        )}
      </div>
    </section>
  );
}
