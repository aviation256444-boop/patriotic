"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import { formatNumber } from "@/lib/utils";
import type { Program } from "@/types";

export default function ProgramsPage() {
  const { data, isLoading, dataUpdatedAt } = useCmsCollection("programs");
  const programs = (data as Program[]) || [];

  return (
    <>
      <PageHero
        badge="Programs"
        title="Eleven Pathways to Impact"
        description="Comprehensive programs designed to equip young Ugandans with skills, values, and opportunities for national transformation."
      />

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program, i) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 6) * 0.08 }}
                >
                  <Link href={`/programs/${program.slug}`} className="group block h-full">
                    <article className="h-full rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1">
                      <div className="relative h-48 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaUrl(
                            program.image,
                            (program as Program & { updatedAt?: string }).updatedAt || dataUpdatedAt
                          )}
                          alt={program.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${program.color || "from-emerald-500 to-green-600"} opacity-30`} />
                        {program.featured && (
                          <span className="absolute top-3 right-3 rounded-full bg-yellow-400 px-2.5 py-0.5 text-[10px] font-bold text-black uppercase">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <h2 className="text-lg font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {program.title}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {program.shortDescription}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatNumber(program.beneficiaries || 0)}+ reached
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            Details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
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
