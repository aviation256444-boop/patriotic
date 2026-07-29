"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { useSiteSettings } from "@/hooks/use-cms";
import {
  DEFAULT_WHATSAPP_GROUP_LABEL,
  getWhatsAppGroupUrl,
} from "@/lib/whatsapp";

export function CTA() {
  const { data: site } = useSiteSettings();
  const waUrl = getWhatsAppGroupUrl(site);
  const waLabel = site?.whatsappGroupLabel || DEFAULT_WHATSAPP_GROUP_LABEL;

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-[#0a0a0a] px-6 py-16 sm:px-12 sm:py-20 text-center"
        >
          <div className="absolute inset-0 opacity-30" aria-hidden="true">
            <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-emerald-600 blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-yellow-500 blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-red-600 blur-[80px]" />
          </div>
          <div className="absolute top-0 left-0 right-0 flag-stripe h-1" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              {site?.ctaTitle || "Ready to Build Uganda's Future?"}
            </h2>
            <p className="mt-4 text-lg text-white/60 leading-relaxed">
              {site?.ctaDescription ||
                "Whether you join as a member, volunteer your time, or support our mission financially — every contribution counts."}
            </p>

            <div className="mt-8">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-8 py-4 text-base font-bold text-white shadow-xl shadow-[#25D366]/30 hover:bg-[#20bd5a] hover:scale-[1.02] transition-all"
              >
                <WhatsAppIcon className="h-6 w-6" />
                {waLabel}
                <ArrowRight className="h-5 w-5" />
              </a>
              <p className="mt-3 text-sm text-white/50">
                Step 1: Enter the WhatsApp group · Step 2: Register as a member
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/membership">
                <Button size="lg" className="group">
                  <Users className="h-4 w-4" />
                  Become a Member
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/volunteer">
                <Button size="lg" variant="glass" className="text-white border-white/20">
                  Volunteer With Us
                </Button>
              </Link>
              <Link href="/impact">
                <Button size="lg" variant="outline" className="text-white border-white/25 hover:bg-white/10">
                  See our impact
                </Button>
              </Link>
              <Link href="/donate">
                <Button size="lg" variant="secondary">
                  <Heart className="h-4 w-4" />
                  Make a Donation
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
