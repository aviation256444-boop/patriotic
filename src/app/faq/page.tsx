"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { cn } from "@/lib/utils";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I become a member?",
    a: "Create an account (email or Google), complete the membership application on /membership, and wait for approval. You will receive a membership number and digital card in your dashboard.",
  },
  {
    q: "How do I join the WhatsApp community?",
    a: "Use the official WhatsApp group link from the homepage, footer, or Contact page. That is the fastest way to hear about events and opportunities.",
  },
  {
    q: "How do payments work?",
    a: "You can pay with Airtel Money or MTN MoMo (via PawaPay where configured), and card when Square is enabled. Enter your phone number, approve the PIN prompt on your phone, and keep the page open until you see a success receipt.",
  },
  {
    q: "Can I get a refund?",
    a: "Donations are usually non-refundable. Event tickets follow the rules on each event page. When a refund is issued by Super Admin, money returns to the original payer, not an arbitrary number.",
  },
  {
    q: "How do event tickets work?",
    a: "Open an event, choose seats if required, complete payment, then open your e-ticket from the confirmation page or dashboard. Tickets include a unique code for entry.",
  },
  {
    q: "Is my data safe?",
    a: "We use HTTPS, role-based admin access, and do not store your mobile money PIN. Read the full Privacy Policy at /privacy.",
  },
  {
    q: "How can I volunteer?",
    a: "Visit /volunteer to register interest and track hours. District and national opportunities are also listed under Opportunities.",
  },
  {
    q: "Who can I contact for help?",
    a: "Email info@pyu.ug, call the hotline on the Contact page, or ask the on-site AI assistant for quick answers about programs and membership.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHero
        badge="Help"
        title="Frequently asked questions"
        description="Quick answers about membership, payments, events, and volunteering."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-border/50 bg-card overflow-hidden"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  {item.q}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}

          <p className="pt-8 text-sm text-muted-foreground text-center">
            Still need help?{" "}
            <Link href="/contact" className="text-emerald-600 font-semibold hover:underline">
              Contact us
            </Link>{" "}
            or review our{" "}
            <Link href="/privacy" className="text-emerald-600 font-semibold hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
