"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Ticket,
  QrCode,
  Minus,
  Plus,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentCheckout, type PaymentReceipt } from "@/components/payments/payment-checkout";
import {
  OfficialReceipt,
  gatewayLabel,
} from "@/components/payments/official-receipt";
import { LocationMap } from "@/components/maps/location-map";
import { useCmsCollection, findBySlug } from "@/hooks/use-cms";
import { resolveEventPricing } from "@/lib/events/pricing";
import { resolveDistrictCoords, googleMapsUrl } from "@/lib/maps/coords";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { Event } from "@/types";

type IssuedTicket = {
  id: string;
  ticketCode: string;
  receiptId: string;
  seats: number;
  amountPaid: number;
  currency: string;
  eventTitle?: string;
  eventSlug?: string;
  eventLocation?: string;
  eventDistrict?: string;
  eventStartDate?: string;
  eventType?: string;
  userName?: string;
  userEmail?: string;
  paymentMethod?: string;
  paymentExternalId?: string;
  paidAt?: string;
  status?: string;
};

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { data, isLoading } = useCmsCollection("events");
  const event = findBySlug((data as Event[]) || [], slug);
  const { user } = useAuthStore();
  const [seats, setSeats] = useState(1);
  const [payReady, setPayReady] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [ticket, setTicket] = useState<IssuedTicket | null>(null);

  const remaining = useMemo(() => {
    if (!event) return 0;
    const cap = Number(event.capacity) || 0;
    const reg = Number(event.registered) || 0;
    return Math.max(0, cap - reg);
  }, [event]);

  // Price > 0 always means paid (shows Airtel/MTN/card) even if isFree was left checked
  const { isFree, unitPrice } = resolveEventPricing(event);
  const total = unitPrice * seats;
  const capacity = Number(event?.capacity) || 0;

  const issueTicket = useCallback(
    async (payment?: PaymentReceipt | null) => {
      if (!event || !user) return null;
      setIssuing(true);
      try {
        const res = await fetch("/api/events/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            eventSlug: event.slug,
            seats,
            userId: user.id,
            userName: user.fullName,
            userEmail: user.email,
            userPhone: user.phone,
            paymentId: payment?.paymentId,
            paymentExternalId: payment?.externalId,
            paymentMethod: payment?.gateway || (isFree ? "free" : undefined),
            gateway: payment?.gateway,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not issue ticket");
        }
        const issued = {
          ...data.ticket,
          eventTitle: data.ticket.eventTitle || event.title,
          eventSlug: data.ticket.eventSlug || event.slug,
          eventLocation: data.ticket.eventLocation || event.location,
          eventDistrict: data.ticket.eventDistrict || event.district,
          eventStartDate: data.ticket.eventStartDate || event.startDate,
          eventType: data.ticket.eventType || event.type,
          userName: data.ticket.userName || user.fullName,
          userEmail: data.ticket.userEmail || user.email,
          paymentMethod: data.ticket.paymentMethod,
          paidAt: data.ticket.paidAt || new Date().toISOString(),
        } as IssuedTicket;
        setTicket(issued);
        setPayReady(false);
        toast.success("Ticket & receipt ready!", {
          description: `Receipt ${data.ticket.receiptId} — print or save PDF below`,
        });
        // Keep user on page with full official receipt (also open dedicated page)
        if (data.ticket?.id) {
          window.setTimeout(() => {
            router.push(`/tickets/${data.ticket.id}`);
          }, 1800);
        }
        return issued;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ticket issue failed");
        return null;
      } finally {
        setIssuing(false);
      }
    },
    [event, user, seats, isFree]
  );

  if (isLoading) {
    return (
      <div className="pt-28 px-4">
        <Skeleton className="h-64 w-full max-w-7xl mx-auto rounded-2xl" />
      </div>
    );
  }

  if (!event) notFound();

  const handleRegister = () => {
    if (!user) {
      toast.error("Please sign in to book seats", {
        description: "Create an account or log in to get your QR ticket.",
      });
      router.push(`/auth/login?next=/events/${event.slug}`);
      return;
    }
    if (remaining < seats) {
      toast.error(`Only ${remaining} seat(s) available`);
      return;
    }
    if (isFree) {
      void issueTicket(null);
      return;
    }
    if (total < 500) {
      toast.error("Event price too low for mobile money", {
        description: "Set price to at least UGX 500 per seat in the admin panel.",
      });
      return;
    }
    // Paid: open payment gateways (Airtel, MTN, card)
    setPayReady(true);
  };

  return (
    <>
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image || "/og-image.png"}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> All Events
          </Link>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="bg-black/40 text-white border-white/20">
              {event.type || "event"}
            </Badge>
            <Badge variant={isFree ? "success" : "secondary"}>
              {isFree ? "Free Entry" : `UGX ${unitPrice.toLocaleString()} / seat`}
            </Badge>
            {!isFree && (
              <Badge className="bg-[#ED1C24] text-white border-0">
                <Smartphone className="h-3 w-3 mr-1" />
                Airtel · MTN · Card
              </Badge>
            )}
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white max-w-3xl"
          >
            {event.title}
          </motion.h1>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {event.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium text-sm">
                      {event.startDate ? formatDate(event.startDate) : "TBA"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium text-sm">{event.location || "TBA"}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Seats left</p>
                    <p className="font-medium text-sm">
                      {remaining.toLocaleString()} / {capacity.toLocaleString() || "—"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Organizer</p>
                    <p className="font-medium text-sm">{event.organizer || "PYU"}</p>
                  </div>
                </div>
              </div>

              {Array.isArray(event.agenda) && event.agenda.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Agenda</h2>
                  <div className="space-y-3">
                    {event.agenda.map((item) => (
                      <div
                        key={item.time + item.title}
                        className="flex gap-4 rounded-xl border border-border/50 p-4"
                      >
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 w-14">
                          {item.time}
                        </span>
                        <span className="text-sm">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const ev = event as Event & { lat?: number; lng?: number };
                const coords =
                  resolveDistrictCoords(ev.district || ev.location, ev.lat, ev.lng) ||
                  resolveDistrictCoords(ev.location);
                if (!coords || event.type === "online") return null;
                return (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Venue map</h2>
                    <LocationMap
                      height={320}
                      center={[coords.lat, coords.lng]}
                      zoom={12}
                      scrollWheelZoom={false}
                      markers={[
                        {
                          id: event.id,
                          lat: coords.lat,
                          lng: coords.lng,
                          title: event.title,
                          description: event.location || event.district || "Event venue",
                        },
                      ]}
                    />
                    <a
                      href={googleMapsUrl(
                        coords.lat,
                        coords.lng,
                        event.location || event.title
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Directions in Google Maps →
                    </a>
                  </div>
                );
              })()}
            </div>

            <aside>
              <div className="rounded-2xl border border-border/50 bg-card p-6 sticky top-24 space-y-4">
                <h3 className="font-bold text-lg">Book seats</h3>
                {!ticket ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {isFree
                        ? "Free registration — QR ticket issued immediately after you sign in."
                        : "Pay with Airtel Money, MTN MoMo, or card. Your ticket and e-receipt are issued only after payment is confirmed."}
                    </p>

                    {!isFree && (
                      <div className="rounded-xl border border-[#ED1C24]/30 bg-[#ED1C24]/5 p-3 text-xs space-y-1">
                        <p className="font-semibold text-[#ED1C24] flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5" /> Payment options
                        </p>
                        <p className="text-muted-foreground">
                          Airtel Money · MTN MoMo (PawaPay) · Visa / Mastercard
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                      <span className="text-sm font-medium">Seats</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                          onClick={() => setSeats((s) => Math.max(1, s - 1))}
                          aria-label="Fewer seats"
                          disabled={payReady}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-bold">{seats}</span>
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                          onClick={() =>
                            setSeats((s) =>
                              Math.min(Math.max(remaining, 1), Math.min(10, s + 1))
                            )
                          }
                          aria-label="More seats"
                          disabled={payReady}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-center py-1">
                      <p className="text-3xl font-bold">
                        {isFree ? "Free" : `UGX ${total.toLocaleString()}`}
                      </p>
                      {!isFree && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {seats} × UGX {unitPrice.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {!user && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2">
                        Sign in required to book and receive your QR ticket.
                      </p>
                    )}

                    {!payReady ? (
                      <Button
                        className="w-full"
                        size="lg"
                        loading={issuing}
                        onClick={handleRegister}
                        disabled={
                          event.status === "past" ||
                          event.status === "cancelled" ||
                          remaining < 1
                        }
                      >
                        <Ticket className="h-4 w-4" />
                        {event.status === "past" || event.status === "cancelled"
                          ? "Event not open"
                          : remaining < 1
                            ? "Sold out"
                            : !user
                              ? "Sign in to book"
                              : isFree
                                ? "Register & get ticket"
                                : "Continue to payment"}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Choose payment method</p>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground underline"
                            onClick={() => setPayReady(false)}
                          >
                            Change seats
                          </button>
                        </div>
                        <PaymentCheckout
                          amount={total}
                          currency="UGX"
                          purpose="event"
                          campaign={event.slug}
                          donorName={user?.fullName}
                          email={user?.email}
                          meta={{
                            eventId: event.id,
                            eventTitle: event.title,
                            seats,
                          }}
                          disableAutoRedirect
                          onSuccess={async (receipt) => {
                            await issueTicket(receipt);
                          }}
                          onCancel={() => setPayReady(false)}
                        />
                        <p className="text-[11px] text-center text-muted-foreground">
                          Ticket is not created until payment status is confirmed.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <QrCode className="h-5 w-5" />
                      <span className="font-semibold">Ticket confirmed</span>
                    </div>
                    <Badge variant="success">Official receipt ready</Badge>
                    <p className="text-sm text-muted-foreground">
                      Your one-page e-ticket is shown below. Opening the full
                      receipt page…
                    </p>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {ticket.ticketCode}
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                    >
                      Open full e-receipt
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      Print this page
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Full official event receipt (one page print) */}
          {ticket && (
            <div className="mt-12 pt-10 border-t border-border/50">
              <div className="no-print mb-6 text-center space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Event ticket · Official e-receipt
                </p>
                <h2 className="text-xl font-black">Your ticket & receipt</h2>
                <p className="text-sm text-muted-foreground">
                  Same design as the dedicated receipt page · Fits one printed page
                </p>
              </div>
              <OfficialReceipt
                kind="event"
                title={ticket.eventTitle || event.title}
                subtitle={`Event entry pass for ${ticket.userName || user?.fullName || "guest"}. Present this QR at check-in.`}
                amount={Number(ticket.amountPaid)}
                currency={ticket.currency || "UGX"}
                method={
                  ticket.paymentMethod === "free"
                    ? "Free registration"
                    : gatewayLabel(ticket.paymentMethod || "free")
                }
                reference={ticket.receiptId}
                paidAt={ticket.paidAt}
                statusLabel="Ticket confirmed"
                highlightRows={[
                  {
                    label: "Event date",
                    value: event.startDate
                      ? formatDate(event.startDate, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "TBA",
                  },
                  {
                    label: "Venue",
                    value:
                      ticket.eventLocation ||
                      event.location ||
                      event.district ||
                      (event.type === "online" ? "Online" : "See details"),
                  },
                  {
                    label: "Seats",
                    value: `${ticket.seats} seat${ticket.seats === 1 ? "" : "s"}`,
                  },
                ]}
                rows={[
                  {
                    label: "Guest",
                    value: ticket.userName || user?.fullName || "—",
                  },
                  {
                    label: "Email",
                    value: ticket.userEmail || user?.email || "—",
                  },
                  { label: "Ticket code", value: ticket.ticketCode },
                  ...(event.district
                    ? [{ label: "District", value: event.district }]
                    : []),
                ]}
                qrValue={`PYU-TICKET:${ticket.ticketCode}`}
                qrCaption="Scan at venue check-in · Official PYU event pass"
                secondaryHref={`/tickets/${ticket.id}`}
                secondaryLabel="Open receipt page"
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
