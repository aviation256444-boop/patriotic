"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Users, Ticket, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentCheckout } from "@/components/payments/payment-checkout";
import { useCmsCollection, findBySlug } from "@/hooks/use-cms";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { Event } from "@/types";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading } = useCmsCollection("events");
  const event = findBySlug((data as Event[]) || [], slug);
  const { user } = useAuthStore();
  const [registered, setRegistered] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [payReady, setPayReady] = useState(false);

  const issueTicket = useCallback(() => {
    if (!event) return;
    const id = `TKT-${event.id}-${Date.now().toString(36).toUpperCase()}`;
    setTicketId(id);
    setRegistered(true);
    setPayReady(false);
    toast.success("Registration successful!", {
      description: "Your QR ticket has been generated.",
    });
  }, [event]);

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
      toast.error("Please sign in to register", {
        description: "Create an account or log in to get your QR ticket.",
      });
      return;
    }

    if (event.isFree || !event.price) {
      issueTicket();
      return;
    }

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
          <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6">
            <ArrowLeft className="h-4 w-4" /> All Events
          </Link>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="bg-black/40 text-white border-white/20">{event.type}</Badge>
            <Badge variant={event.isFree ? "success" : "secondary"}>
              {event.isFree ? "Free Entry" : `UGX ${event.price?.toLocaleString()}`}
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
              <p className="text-lg text-muted-foreground leading-relaxed">{event.description}</p>

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
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="font-medium text-sm">
                      {event.registered.toLocaleString()} / {event.capacity.toLocaleString()}
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
                      <div key={item.time + item.title} className="flex gap-4 rounded-xl border border-border/50 p-4">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 w-14">
                          {item.time}
                        </span>
                        <span className="text-sm">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map placeholder */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Location Map</h2>
                <div className="rounded-2xl border border-border/50 bg-muted/50 h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-medium">{event.location}</p>
                    <p className="text-xs mt-1">Interactive map available with Google Maps API key</p>
                  </div>
                </div>
              </div>
            </div>

            <aside>
              <div className="rounded-2xl border border-border/50 bg-card p-6 sticky top-24 space-y-4">
                <h3 className="font-bold text-lg">Registration</h3>
                {!registered ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Register to receive a QR code ticket for check-in and attendance tracking.
                      {!event.isFree && event.price
                        ? " Paid tickets are charged via MTN MoMo."
                        : ""}
                    </p>
                    <div className="text-center py-2">
                      <p className="text-3xl font-bold">
                        {event.isFree ? "Free" : `UGX ${event.price?.toLocaleString()}`}
                      </p>
                    </div>
                    {!payReady ? (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleRegister}
                        disabled={event.status === "past"}
                      >
                        <Ticket className="h-4 w-4" />
                        {event.status === "past"
                          ? "Event Ended"
                          : event.isFree || !event.price
                          ? "Register Now"
                          : "Pay & Get Ticket"}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <PaymentCheckout
                          amount={event.price || 0}
                          currency="UGX"
                          purpose="event"
                          campaign={event.slug}
                          donorName={user?.fullName}
                          email={user?.email}
                          meta={{ eventId: event.id, eventTitle: event.title }}
                          successRedirect="/payments/success"
                          onSuccess={() => issueTicket()}
                          onCancel={() => setPayReady(false)}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <QrCode className="h-5 w-5" />
                      <span className="font-semibold">Your Ticket</span>
                    </div>
                    <div className="flex justify-center p-4 bg-white rounded-xl">
                      <QRCodeSVG value={ticketId} size={160} level="H" />
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{ticketId}</p>
                    <p className="text-sm text-muted-foreground">
                      Present this QR code at the event for check-in.
                    </p>
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
