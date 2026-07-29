"use client";

import Link from "next/link";
import { Newspaper, Download, Mail, Quote } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-cms";

export default function PressPage() {
  const { data: site } = useSiteSettings();
  const email = site?.supportEmail || "info@pyu.ug";

  return (
    <>
      <PageHero
        badge="Press & media"
        title="Press kit"
        description="Boilerplate, brand assets, and media contact for journalists and partners covering Patriotic Youths of Uganda."
      />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Quote className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-bold">About PYU (boilerplate)</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {site?.footerAbout ||
                site?.tagline ||
                "Patriotic Youths of Uganda (PYU) is a national youth movement building Uganda through unity, service, leadership, and development. We equip young people with skills, values, and platforms to transform communities across all districts."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <Newspaper className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-bold mb-2">Newsroom</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Official stories, announcements, and impact features.
              </p>
              <Link href="/news">
                <Button size="sm" variant="outline">
                  Visit news
                </Button>
              </Link>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <Download className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-bold mb-2">Brand assets</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Logo and crest appear site-wide. For high-resolution files or usage guidelines, email media relations.
              </p>
              <Link href="/gallery">
                <Button size="sm" variant="outline">
                  Photo gallery
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-bold">Media inquiries</p>
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  {email}
                </a>
              </div>
            </div>
            <Link href="/contact">
              <Button>Contact form</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
