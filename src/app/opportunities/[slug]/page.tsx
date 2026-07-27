"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection, findBySlug } from "@/hooks/use-cms";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Opportunity } from "@/types";

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading } = useCmsCollection("opportunities");
  const opp = findBySlug((data as Opportunity[]) || [], slug);

  if (isLoading) {
    return (
      <div className="pt-28 px-4 max-w-3xl mx-auto">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!opp) notFound();

  return (
    <section className="pt-28 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> All Opportunities
        </Link>

        <Badge className="mb-4 capitalize">{opp.type}</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{opp.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{opp.description}</p>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 p-4">
            <Building2 className="h-4 w-4 text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground">Organization</p>
            <p className="font-medium text-sm">{opp.organization}</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <MapPin className="h-4 w-4 text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="font-medium text-sm">{opp.location}</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <Calendar className="h-4 w-4 text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className="font-medium text-sm">{formatDate(opp.deadline)}</p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Requirements</h2>
          <ul className="space-y-2">
            {opp.requirements.map((r) => (
              <li key={r} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {opp.benefits && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Benefits</h2>
            <ul className="space-y-2">
              {opp.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10">
          <Button
            size="lg"
            onClick={() =>
              toast.success("Application started!", {
                description: "In production, this submits to the admin dashboard.",
              })
            }
          >
            Apply Now
          </Button>
        </div>
      </div>
    </section>
  );
}
