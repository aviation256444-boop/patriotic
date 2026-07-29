"use client";

import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";

export default function AccessibilityPage() {
  return (
    <>
      <PageHero
        badge="Inclusion"
        title="Accessibility"
        description="We aim to make Patriotic Youths of Uganda usable by everyone, including people with disabilities."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6 text-muted-foreground leading-relaxed">
          <p>
            PYU is committed to improving digital accessibility so young people across Uganda can learn about
            programs, join as members, register for events, and support our work.
          </p>

          <h2 className="text-xl font-bold text-foreground">What we do</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Semantic headings and skip-to-content links on major pages.</li>
            <li>Keyboard-friendly navigation and focus states on interactive controls.</li>
            <li>Colour contrast inspired by the national palette with dark/light themes.</li>
            <li>Descriptive labels on forms and payment fields.</li>
            <li>Responsive layout for phones, tablets, and desktops.</li>
          </ul>

          <h2 className="text-xl font-bold text-foreground">Known limitations</h2>
          <p>
            Some third-party widgets (maps, payment SDKs, chat) may have their own accessibility gaps. CMS
            images should include meaningful alt text when uploaded by editors.
          </p>

          <h2 className="text-xl font-bold text-foreground">Feedback</h2>
          <p>
            If you encounter a barrier, tell us what page you were on and what assistive technology you use.
            Email{" "}
            <a href="mailto:info@pyu.ug" className="text-emerald-600 hover:underline">
              info@pyu.ug
            </a>{" "}
            or use our{" "}
            <Link href="/contact" className="text-emerald-600 hover:underline">
              contact form
            </Link>
            . We will work to fix issues as quickly as we can.
          </p>

          <h2 className="text-xl font-bold text-foreground">Standards</h2>
          <p>
            We target WCAG 2.1 Level AA where practical and continuously improve after user feedback and
            audits.
          </p>
        </div>
      </section>
    </>
  );
}
