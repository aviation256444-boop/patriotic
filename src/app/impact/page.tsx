"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  MapPin,
  HeartHandshake,
  GraduationCap,
  TreePine,
  ArrowRight,
  BarChart3,
  FolderKanban,
  HandHelping,
  Calendar,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { useNationalStats } from "@/hooks/use-cms";
import { formatNumber } from "@/lib/utils";
import type { NationalStats } from "@/lib/cms/types";

const pillars = [
  {
    icon: GraduationCap,
    title: "Skills & leadership",
    text: "Training young people in leadership, ICT, entrepreneurship, and civic values so they can serve communities with competence.",
  },
  {
    icon: HeartHandshake,
    title: "Service & volunteering",
    text: "Nationwide volunteer actions, community clean-ups, and peer mentorship that turn patriotism into practical service.",
  },
  {
    icon: TreePine,
    title: "Climate & livelihood",
    text: "Climate action, agriculture, and youth enterprise pathways that protect the environment and create opportunity.",
  },
];

export default function ImpactPage() {
  const { data: statsRaw } = useNationalStats();
  const stats = (statsRaw || {}) as Partial<NationalStats>;

  const indicators = [
    {
      icon: Users,
      label: "Young patriots engaged",
      value: stats.members != null ? formatNumber(Number(stats.members)) : "125,000+",
    },
    {
      icon: MapPin,
      label: "Districts with presence",
      value: stats.districts != null ? String(stats.districts) : "146",
    },
    {
      icon: FolderKanban,
      label: "Community projects",
      value: stats.projects != null ? formatNumber(Number(stats.projects)) : "—",
    },
    {
      icon: HandHelping,
      label: "Volunteers",
      value: stats.volunteers != null ? formatNumber(Number(stats.volunteers)) : "—",
    },
    {
      icon: Calendar,
      label: "Events delivered",
      value: stats.events != null ? formatNumber(Number(stats.events)) : "—",
    },
    {
      icon: TreePine,
      label: "Trees planted",
      value: stats.treesPlanted != null ? formatNumber(Number(stats.treesPlanted)) : "—",
    },
    {
      icon: GraduationCap,
      label: "Scholarships",
      value: stats.scholarships != null ? formatNumber(Number(stats.scholarships)) : "—",
    },
    {
      icon: BarChart3,
      label: "Youth businesses supported",
      value: stats.businesses != null ? formatNumber(Number(stats.businesses)) : "—",
    },
  ];

  return (
    <>
      <PageHero
        badge="Impact"
        title="Results that matter"
        description="Transparent stories of how members, volunteers, and partners are building Uganda through unity, service, leadership, and development."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {indicators.map((h, i) => (
              <motion.div
                key={h.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.06 }}
                className="rounded-2xl border border-border/50 bg-card p-5 text-center"
              >
                <h.icon className="mx-auto h-7 w-7 text-emerald-600 mb-2" />
                <p className="text-2xl font-black text-emerald-600">{h.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{h.label}</p>
              </motion.div>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">How impact is created</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {pillars.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border/50 bg-card p-6"
                >
                  <p.icon className="h-7 w-7 text-emerald-600 mb-3" />
                  <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-card p-8 sm:p-10">
            <h2 className="text-2xl font-bold mb-3">Accountability</h2>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Donations and event fees are recorded with payment references. Super Admins can review
              completed transactions, issue refunds to original payers where supported, and export
              operational backups. For governance and leadership structure, see our governance page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/governance">
                <Button variant="outline">
                  Governance
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/projects">
                <Button>
                  View projects
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/donate">
                <Button variant="secondary">Support the mission</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
