"use client";

import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";

export default function TermsPage() {
  return (
    <>
      <PageHero
        badge="Legal"
        title="Terms of Use"
        description="Rules for using the Patriotic Youths of Uganda website, membership portal, and payment services."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-UG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">1. Acceptance</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing pyu.ug (or any deployed URL for this platform), creating an account, or making a
            payment, you agree to these Terms and our{" "}
            <Link href="/privacy" className="text-emerald-600 hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the service.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">2. Who may use the platform</h2>
          <p className="text-muted-foreground leading-relaxed">
            You must provide accurate information when registering. Accounts are personal; do not share login
            credentials. Admins and Super Admins must use elevated access only for legitimate PYU operations.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">3. Membership &amp; content</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Membership applications may be reviewed and approved or declined by PYU staff.</li>
            <li>Digital membership cards and QR codes are for identification within PYU programs and events.</li>
            <li>You must not post unlawful, abusive, or misleading content on forums or forms.</li>
            <li>Program, event, and opportunity listings may change; PYU may update or cancel items with notice where practical.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">4. Payments, tickets &amp; donations</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Prices are shown in UGX unless stated otherwise. Confirm the amount on your phone before entering your MoMo or Airtel PIN.</li>
            <li>A payment is only complete after the payment provider confirms success. Do not close the page until you see a receipt.</li>
            <li>Donations are generally voluntary contributions to PYU programs and are not refundable except where required by law or where PYU initiates a refund to the original payer.</li>
            <li>Event ticket refunds follow the rules stated on the event page or as communicated by organisers.</li>
            <li>Withdrawals and refunds from the admin portal are restricted operations for authorised Super Admins only.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">5. Acceptable use</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may not attempt to hack, scrape, overload, reverse-engineer, or disrupt the platform; create
            fake payments or memberships; or use the site to harm others or break Ugandan law.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">6. Intellectual property</h2>
          <p className="text-muted-foreground leading-relaxed">
            PYU logos, crest, site design, and original content belong to Patriotic Youths of Uganda or their
            licensors. You may share public pages with attribution; you may not rebrand or sell our materials
            without written permission.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">7. Third-party services</h2>
          <p className="text-muted-foreground leading-relaxed">
            Google sign-in, WhatsApp groups, payment networks, and hosting providers are third parties with
            their own terms. PYU is not responsible for outages or policies of those services beyond our control.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">8. Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            The platform is provided &quot;as is&quot;. We aim for high availability and accurate content but do not
            guarantee uninterrupted service or error-free information. Impact numbers and program outcomes are
            communicated in good faith and may be updated.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">9. Limitation of liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the fullest extent allowed by law, PYU is not liable for indirect or consequential losses from
            use of the site. Our total liability for any claim related to the platform is limited to the amount
            you paid us (if any) in the three months before the claim, or UGX 100,000, whichever is greater,
            except where liability cannot be limited by law.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">10. Governing law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms are governed by the laws of the Republic of Uganda. Disputes should first be raised
            with us at{" "}
            <a href="mailto:info@pyu.ug" className="text-emerald-600 hover:underline">
              info@pyu.ug
            </a>
            .
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">11. Changes</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these Terms. Material changes will be reflected by the date above. Continued use
            after changes constitutes acceptance.
          </p>
        </div>
      </section>
    </>
  );
}
