"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection, findBySlug } from "@/hooks/use-cms";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading } = useCmsCollection("projects");
  const project = findBySlug((data as Project[]) || [], slug);

  if (isLoading) {
    return (
      <div className="pt-28 px-4">
        <Skeleton className="h-64 w-full max-w-7xl mx-auto rounded-2xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="pt-32 text-center">
        <h1 className="text-2xl font-bold mb-4">Project not found</h1>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> All Projects
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
          <img src={project.images?.[0] || ""} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> All Projects
          </Link>
          <Badge className="mb-4" variant={project.status === "completed" ? "success" : "info"}>
            {(project.status || "").replace("_", " ")}
          </Badge>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white max-w-3xl"
          >
            {project.title}
          </motion.h1>
          <div className="mt-4 flex flex-wrap gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {project.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {formatDate(project.startDate)}
              {project.endDate && ` – ${formatDate(project.endDate)}`}
            </span>
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">{project.description}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Progress</h2>
                <Progress value={project.progress || 0} showLabel className="max-w-md" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Gallery</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(project.images || []).map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={img}
                      alt={`${project.title} photo ${i + 1}`}
                      className="rounded-2xl object-cover h-56 w-full"
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
            </div>
            <aside className="space-y-6">
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-bold mb-4">Impact Statistics</h3>
                <div className="space-y-3">
                  {(project.impactStats || []).map((s) => (
                    <div
                      key={s.label}
                      className="flex justify-between items-center rounded-xl bg-muted/50 px-4 py-3"
                    >
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
