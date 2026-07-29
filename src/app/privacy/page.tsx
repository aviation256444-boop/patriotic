"use client";

import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        badge="Legal"
        title="Privacy Policy"
        description="How Patriotic Youths of Uganda collects, uses, and protects your personal information."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-neutral dark:prose-invert">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">1. Who we are</h2>
          <p className="text-muted-foreground leading-relaxed">
            Patriotic Youths of Uganda (&quot;PYU&quot;, &quot;we&quot;, &quot;us&quot;) operates this website and related
            member services. Contact:{" "}
            <a href="mailto:info@pyu.ug" className="text-emerald-600 hover:underline">
              info@pyu.ug
            </a>
            .
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">2. Information we collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Account details: name, email, phone, district, and profile photo when you register or sign in.</li>
            <li>Membership and volunteer information you submit on forms.</li>
            <li>Payment metadata for donations, event tickets, and membership fees (amount, method, reference, phone used for mobile money). We do not store full card PINs or MoMo PINs.</li>
            <li>Technical data: browser type, device, and approximate usage logs needed to keep the service secure.</li>
            <li>Messages you send via contact forms or our AI assistant.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">3. How we use your information</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>To create and manage your membership and digital membership card.</li>
            <li>To process payments, issue receipts, and prevent fraud.</li>
            <li>To communicate events, opportunities, and program updates you request.</li>
            <li>To improve the website and keep accounts secure.</li>
            <li>To comply with legal obligations in Uganda.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">4. Payments</h2>
          <p className="text-muted-foreground leading-relaxed">
            Mobile money and card payments are processed by licensed providers (for example PawaPay, MTN MoMo,
            Airtel Money, or Square). Those providers process your payment under their own policies. PYU stores
            confirmation references so we can show receipts and handle refunds to the original payer where supported.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">5. Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal data. We may share limited data with payment processors, hosting providers,
            email/SMS tools, and authorities when required by law. Access for staff is role-based (member, admin,
            super admin).
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">6. Cookies &amp; analytics</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use essential cookies for login sessions and preferences (for example theme). Optional analytics
            only load when configured by PYU and are used in aggregate form to understand site usage.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">7. Data retention &amp; security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We keep account and payment records as long as needed for membership, financial audit, and legal
            requirements. We use HTTPS, access controls, and secure hosting. No method of transmission is 100%
            secure; please use a strong password and keep your login private.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">8. Your rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may request access, correction, or deletion of your account data by emailing{" "}
            <a href="mailto:info@pyu.ug" className="text-emerald-600 hover:underline">
              info@pyu.ug
            </a>
            , subject to legal retention duties (for example completed payment records).
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">9. Children</h2>
          <p className="text-muted-foreground leading-relaxed">
            This site is intended for youth and adults engaging in PYU programs. Where a minor participates,
            a parent or guardian should supervise registration and payments.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-3">10. Changes</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this policy. The date at the top will change when we do. Continued use of the site
            after updates means you accept the revised policy.
          </p>

          <p className="mt-10 text-sm text-muted-foreground">
            See also our{" "}
            <Link href="/terms" className="text-emerald-600 hover:underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/accessibility" className="text-emerald-600 hover:underline">
              Accessibility statement
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
