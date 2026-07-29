"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { eventPriceLabel, resolveEventPricing } from "@/lib/events/pricing";
import { formatDate, cn } from "@/lib/utils";
import type { Event } from "@/types";

function Countdown({ date }: { date: string }) {
  const target = new Date(date).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (diff === 0) return <span className="text-xs text-emerald-500 font-medium">Happening now</span>;
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {days}d {hours}h remaining
    </span>
  );
}

export default function EventsPage() {
  const { data, isLoading } = useCmsCollection("events");
  const events = (data as Event[]) || [];
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const filtered = useMemo(
    () =>
      events.filter((e) =>
        tab === "upcoming" ? e.status === "upcoming" || e.status === "ongoing" : e.status === "past"
      ),
    [tab, events]
  );

  return (
    <>
      <PageHero
        badge="Events"
        title="Connect, Learn & Serve"
        description="Upcoming and past events with registration, QR tickets, and community gatherings nationwide."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 mb-10">
            {(["upcoming", "past"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium capitalize transition-all",
                  tab === t
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t} Events
              </button>
            ))}
          </div>

          {/* Calendar-style month header */}
          <div className="mb-8 rounded-2xl border border-border/50 bg-card p-4 flex flex-wrap gap-2">
            {filtered.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
              >
                <Calendar className="h-3 w-3" />
                {formatDate(e.startDate, { month: "short", day: "numeric" })} — {e.title}
              </span>
            ))}
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={tab === "upcoming" ? "No upcoming events yet" : "No past events listed"}
              description={
                tab === "upcoming"
                  ? "Check back soon, join the WhatsApp group for announcements, or explore programs while you wait."
                  : "Past events will appear here after they are marked complete in the CMS."
              }
              actionHref="/programs"
              actionLabel="Browse programs"
            />
          ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 6) * 0.08 }}
              >
                <Link href={`/events/${event.slug}`} className="group block h-full">
                  <article className="h-full rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="relative h-44 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.image}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge variant="outline" className="bg-black/40 text-white border-white/20 backdrop-blur-sm">
                          {event.type}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge
                          variant={
                            resolveEventPricing(event).isFree ? "success" : "secondary"
                          }
                        >
                          {eventPriceLabel(event)}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-5">
                      <h2 className="font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {event.title}
                      </h2>
                      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                          {event.startDate ? formatDate(event.startDate) : "Date TBA"}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                          {event.location || "Location TBA"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                          {(Number(event.registered) || 0).toLocaleString()} registered
                        </p>
                      </div>
                      {event.status === "upcoming" && (
                        <div className="mt-3">
                          <Countdown date={event.startDate} />
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>
    </>
  );
}
