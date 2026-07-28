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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentCheckout, type PaymentReceipt } from "@/components/payments/payment-checkout";
import { useCmsCollection, findBySlug } from "@/hooks/use-cms";
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
    return Math.max(0, (event.capacity || 0) - (event.registered || 0));
  }, [event]);

  const isFree = Boolean(event?.isFree) || !event?.price || event.price <= 0;
  const unitPrice = isFree ? 0 : Number(event?.price) || 0;
  const total = unitPrice * seats;

  const issueTicket = useCallback(
    async (payment?: PaymentReceipt | null) => {
      if (!event || !user) return;
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
        setTicket(data.ticket);
        setPayReady(false);
        toast.success("Ticket issued!", {
          description: `Receipt ${data.ticket.receiptId}`,
        });
        // Hard navigate so e-receipt is the source of truth after pay
        if (data.ticket?.id) {
          window.setTimeout(() => {
            window.location.href = `/tickets/${data.ticket.id}`;
          }, 400);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ticket issue failed");
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
    // Paid: open payment — ticket only after confirmed payment
    setPayReady(true);
  };

  return (
    <>
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.image} alt="" className="h-full w-full object-cover" />
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
              {event.type}
            </Badge>
            <Badge variant={isFree ? "success" : "secondary"}>
              {isFree ? "Free Entry" : `UGX ${unitPrice.toLocaleString()} / seat`}
            </Badge>
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
                    <p className="font-medium text-sm">{formatDate(event.startDate)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium text-sm">{event.location}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Seats left</p>
                    <p className="font-medium text-sm">
                      {remaining.toLocaleString()} / {event.capacity.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Organizer</p>
                    <p className="font-medium text-sm">{event.organizer}</p>
                  </div>
                </div>
              </div>

              {event.agenda && (
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
            </div>

            <aside>
              <div className="rounded-2xl border border-border/50 bg-card p-6 sticky top-24 space-y-4">
                <h3 className="font-bold text-lg">Book seats</h3>
                {!ticket ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {isFree
                        ? "Free registration — QR ticket issued immediately."
                        : "Pay with Airtel Money, MTN MoMo, or card. Your ticket and e-receipt are issued only after payment is confirmed."}
                    </p>

                    <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                      <span className="text-sm font-medium">Seats</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                          onClick={() => setSeats((s) => Math.max(1, s - 1))}
                          aria-label="Fewer seats"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-bold">{seats}</span>
                        <button
                          type="button"
                          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                          onClick={() =>
                            setSeats((s) => Math.min(remaining || 1, Math.min(10, s + 1)))
                          }
                          aria-label="More seats"
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

                    {!payReady ? (
                      <Button
                        className="w-full"
                        size="lg"
                        loading={issuing}
                        onClick={handleRegister}
                        disabled={event.status === "past" || remaining < 1}
                      >
                        <Ticket className="h-4 w-4" />
                        {event.status === "past"
                          ? "Event ended"
                          : remaining < 1
                            ? "Sold out"
                            : isFree
                              ? "Register & get ticket"
                              : "Continue to payment"}
                      </Button>
                    ) : (
                      <div className="space-y-3">
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
                          successRedirect={`/events/${event.slug}`}
                          onSuccess={(receipt) => {
                            void issueTicket(receipt);
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
                      <span className="font-semibold">Your ticket</span>
                    </div>
                    <Badge variant="success">Confirmed</Badge>
                    <div className="flex justify-center p-4 bg-white rounded-xl">
                      <QRCodeSVG
                        value={`PYU-TICKET:${ticket.ticketCode}`}
                        size={160}
                        level="H"
                      />
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {ticket.ticketCode}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      Receipt: {ticket.receiptId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.seats} seat(s) · {ticket.currency}{" "}
                      {ticket.amountPaid.toLocaleString()} paid
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                    >
                      Open e-receipt
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
