"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import { formatNumber } from "@/lib/utils";
import type { Program } from "@/types";

export function FeaturedPrograms() {
  const { data, isLoading, dataUpdatedAt } = useCmsCollection("programs");
  const programs = ((data as Program[]) || []).filter((p) => p.featured).slice(0, 6);
  const display = programs.length ? programs : ((data as Program[]) || []).slice(0, 6);

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Our Programs"
          title="Empowering Youth Across Every Pillar"
          description="From leadership to climate action, our programs equip young Ugandans with skills, values, and opportunities to transform communities."
        />

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {display.map((program, i) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
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
                      <div className={`absolute inset-0 bg-gradient-to-t ${program.color || "from-emerald-500 to-green-600"} opacity-40`} />
                      <div className="absolute bottom-3 left-3">
                        <span className="rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                          {formatNumber(program.beneficiaries || 0)}+ beneficiaries
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {program.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {program.shortDescription}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Learn more
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/programs">
            <Button variant="outline" size="lg">
              View All Programs <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
