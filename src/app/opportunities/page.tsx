"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, Laptop, Trophy, Banknote, BookOpen, HandHelping, Calendar, MapPin, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { formatDate, cn } from "@/lib/utils";
import type { Opportunity } from "@/types";

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  job: { icon: Briefcase, color: "text-blue-500", label: "Jobs" },
  scholarship: { icon: GraduationCap, color: "text-purple-500", label: "Scholarships" },
  internship: { icon: Laptop, color: "text-cyan-500", label: "Internships" },
  competition: { icon: Trophy, color: "text-yellow-500", label: "Competitions" },
  grant: { icon: Banknote, color: "text-emerald-500", label: "Grants" },
  training: { icon: BookOpen, color: "text-orange-500", label: "Training" },
  volunteer: { icon: HandHelping, color: "text-pink-500", label: "Volunteer" },
};

export default function OpportunitiesPage() {
  const { data, isLoading } = useCmsCollection("opportunities");
  const opportunities = (data as Opportunity[]) || [];
  const [filter, setFilter] = useState("all");
  const types = ["all", ...Object.keys(typeConfig)];

  const filtered = useMemo(
    () =>
      filter === "all"
        ? opportunities.filter((o) => o.isActive !== false)
        : opportunities.filter((o) => o.isActive !== false && o.type === filter),
    [filter, opportunities]
  );

  return (
    <>
      <PageHero
        badge="Opportunities"
        title="Open Doors for Youth"
        description="Jobs, scholarships, internships, competitions, grants, training, and volunteer opportunities."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 mb-10">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium capitalize transition-all",
                  filter === t
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t === "all" ? "All" : typeConfig[t]?.label || t}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((opp, i) => {
              const config = typeConfig[opp.type];
              const Icon = config?.icon || Briefcase;
              return (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 6) * 0.08 }}
                >
                  <Link href={`/opportunities/${opp.slug}`} className="group block h-full">
                    <article className="h-full rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      {opp.image && (
                        <div className="h-36 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={opp.image} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`h-4 w-4 ${config?.color}`} />
                          <Badge variant="outline" className="capitalize">{opp.type}</Badge>
                        </div>
                        <h2 className="font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {opp.title}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-emerald-500" /> {opp.location}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-emerald-500" /> Deadline: {formatDate(opp.deadline)}
                          </p>
                        </div>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                          View details <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      </section>
    </>
  );
}
