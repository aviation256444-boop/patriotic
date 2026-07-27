"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection, findBySlug } from "@/hooks/use-cms";
import { formatNumber } from "@/lib/utils";
import type { Program } from "@/types";

export default function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading } = useCmsCollection("programs");
  const programs = (data as Program[]) || [];
  const program = findBySlug(programs, slug);
  const related = programs.filter((p) => p.id !== program?.id).slice(0, 3);

  if (isLoading) {
    return (
      <div className="pt-28 pb-16 mx-auto max-w-7xl px-4">
        <Skeleton className="h-64 w-full rounded-2xl mb-8" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="pt-32 pb-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Program not found</h1>
        <Link href="/programs">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> All Programs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={program.image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
          <div className={`absolute inset-0 bg-gradient-to-t ${program.color || "from-emerald-500 to-green-600"} opacity-30`} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/programs" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Programs
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white max-w-3xl"
          >
            {program.title}
          </motion.h1>
          <p className="mt-4 text-lg text-white/70 max-w-2xl">{program.shortDescription}</p>
          <div className="mt-6 flex items-center gap-4 text-white/80">
            <span className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4" />
              {formatNumber(program.beneficiaries || 0)}+ beneficiaries
            </span>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              <div>
                <h2 className="text-2xl font-bold mb-4">About This Program</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">{program.description}</p>
              </div>

              {(program.goals?.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Target className="h-6 w-6 text-emerald-500" /> Goals
                  </h2>
                  <ul className="space-y-3">
                    {program.goals.map((goal) => (
                      <li key={goal} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(program.activities?.length ?? 0) > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Key Activities</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {program.activities.map((a) => (
                      <div
                        key={a}
                        className="rounded-xl border border-border/50 bg-card p-4 text-sm font-medium hover:border-emerald-500/30 transition-colors"
                      >
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {program.impact && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                  <h3 className="font-bold text-lg mb-2">Impact</h3>
                  <p className="text-muted-foreground">{program.impact}</p>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-border/50 bg-card p-6 sticky top-24">
                <h3 className="font-bold mb-4">Get Involved</h3>
                <div className="space-y-3">
                  <Link href="/membership" className="block">
                    <Button className="w-full">Join This Program</Button>
                  </Link>
                  <Link href="/volunteer" className="block">
                    <Button variant="outline" className="w-full">Volunteer</Button>
                  </Link>
                  <Link href="/contact" className="block">
                    <Button variant="ghost" className="w-full">Contact Us</Button>
                  </Link>
                </div>
              </div>

              {related.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Related Programs</h3>
                  <div className="space-y-3">
                    {related.map((p) => (
                      <Link
                        key={p.id}
                        href={`/programs/${p.slug}`}
                        className="flex gap-3 rounded-xl border border-border/50 p-3 hover:border-emerald-500/30 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                        <div>
                          <p className="text-sm font-semibold">{p.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{p.shortDescription}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
