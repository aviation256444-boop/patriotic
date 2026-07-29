"use client";

import Link from "next/link";
import { Shield, Network, Users, FileText, Scale, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";

const layers = [
  {
    icon: Scale,
    title: "National leadership",
    text: "Strategic direction, partnerships, national programs, and fiduciary oversight of platforms and funds.",
  },
  {
    icon: Network,
    title: "Regional & district structure",
    text: "Coordination across regions and districts so programs reach young people where they live.",
  },
  {
    icon: Users,
    title: "Members & volunteers",
    text: "Grassroots participation through membership, chapters, events, and service projects.",
  },
  {
    icon: Shield,
    title: "Platform roles",
    text: "Member, Admin, and Super Admin roles with least-privilege access to CMS, payments, and user data.",
  },
];

export default function GovernancePage() {
  return (
    <>
      <PageHero
        badge="Governance"
        title="How we are organised"
        description="Clear structure, responsible stewardship of resources, and open channels for members and the public."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="grid sm:grid-cols-2 gap-6">
            {layers.map((l) => (
              <div
                key={l.title}
                className="rounded-2xl border border-border/50 bg-card p-6"
              >
                <l.icon className="h-7 w-7 text-emerald-600 mb-3" />
                <h2 className="text-lg font-bold mb-2">{l.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{l.text}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-bold">Financial stewardship</h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Donations and ticket sales are confirmed only after payment-provider success.</li>
              <li>Receipts show amount, method, and reference for member and admin records.</li>
              <li>Refunds (when issued) return funds to the original payer number or method.</li>
              <li>Super Admin tools cover user promotion, content CMS, payment review, and backups.</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/about#leadership">
              <Button>
                Meet leadership
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/about#structure">
              <Button variant="outline">Organisational structure</Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary">Contact us</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
