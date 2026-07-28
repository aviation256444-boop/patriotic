"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { formatDate } from "@/lib/utils";
import type { Event } from "@/types";

export function UpcomingEvents() {
  const { data, isLoading } = useCmsCollection("events");
  const upcoming = ((data as Event[]) || [])
    .filter((e) => e.status === "upcoming" || e.status === "ongoing")
    .slice(0, 3);

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Events"
          title="Upcoming Gatherings"
          description="Connect, learn, and serve at events happening across Uganda."
        />

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {upcoming.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
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
                      <div className="absolute top-3 right-3">
                        <Badge
                          variant={
                            Number(event.price) > 0 ? "secondary" : "success"
                          }
                        >
                          {Number(event.price) > 0
                            ? `UGX ${Number(event.price).toLocaleString()}`
                            : "Free"}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {event.title}
                      </h3>
                      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                          {formatDate(event.startDate)}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                          {event.location}
                        </p>
                        <p className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                          {(event.registered || 0).toLocaleString()} / {(event.capacity || 0).toLocaleString()} registered
                        </p>
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/events">
            <Button variant="outline" size="lg">
              All Events <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
