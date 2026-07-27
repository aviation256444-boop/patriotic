"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

const statuses = ["all", "ongoing", "completed", "planned"] as const;

export default function ProjectsPage() {
  const { data, isLoading } = useCmsCollection("projects");
  const projects = (data as Project[]) || [];
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <>
      <PageHero
        badge="Projects"
        title="Impact Across Uganda"
        description="Completed and ongoing projects transforming communities through youth-led development."
      />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 mb-10">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium capitalize transition-all",
                  filter === s
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 6) * 0.08 }}
                >
                  <Link href={`/projects/${project.slug}`} className="group block h-full">
                    <article className="h-full rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="relative h-48 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={project.images?.[0] || "/icons/icon-192x192.png"}
                          alt={project.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <Badge
                          className="absolute top-3 left-3"
                          variant={
                            project.status === "completed"
                              ? "success"
                              : project.status === "ongoing"
                              ? "info"
                              : "warning"
                          }
                        >
                          {(project.status || "").replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="p-5">
                        <Badge variant="outline" className="mb-2">
                          {project.category}
                        </Badge>
                        <h2 className="font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {project.title}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-emerald-500" />
                          {project.location}
                        </p>
                        <div className="mt-4">
                          <Progress value={project.progress || 0} showLabel />
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
