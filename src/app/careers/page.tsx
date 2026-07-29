"use client";

import Link from "next/link";
import { Briefcase, Heart, Users, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

const reasons = [
  {
    icon: Heart,
    title: "Mission-driven",
    text: "Work on programs that strengthen patriotism, skills, and service among Ugandan youth.",
  },
  {
    icon: Users,
    title: "National network",
    text: "Collaborate with leaders and volunteers across districts and partner organisations.",
  },
  {
    icon: Briefcase,
    title: "Growth",
    text: "Build experience in program delivery, communications, operations, and digital platforms.",
  },
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        badge="Careers"
        title="Work with PYU"
        description="Join the team building a patriotic, skilled generation. Staff roles, internships, and volunteer leadership pathways."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid md:grid-cols-3 gap-6">
            {reasons.map((r) => (
              <div
                key={r.title}
                className="rounded-2xl border border-border/50 bg-card p-6"
              >
                <r.icon className="h-7 w-7 text-emerald-600 mb-3" />
                <h2 className="font-bold text-lg mb-2">{r.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Open roles</h2>
            <EmptyState
              icon={Briefcase}
              title="No open staff vacancies right now"
              description="Check Opportunities for internships, fellowships, and program roles. You can also volunteer or send a general interest email."
              actionHref="/opportunities"
              actionLabel="Browse opportunities"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/volunteer">
              <Button>
                Volunteer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline">Send CV / inquiry</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
