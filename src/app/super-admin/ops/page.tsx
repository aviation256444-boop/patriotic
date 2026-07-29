"use client";

import Link from "next/link";
import {
  Database,
  CreditCard,
  Shield,
  Globe,
  Server,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

const sections = [
  {
    icon: Globe,
    title: "Custom domain (recommended)",
    items: [
      "Point a domain (e.g. pyu.ug or www.pyu.ug) to your Render service.",
      "Set NEXT_PUBLIC_APP_URL to https://your-domain in Render env.",
      "Update Google OAuth authorized origins/redirects to the same domain.",
      "Update PawaPay callback URLs to https://your-domain/api/payments/pawapay/callback.",
    ],
  },
  {
    icon: Database,
    title: "Database & backups",
    items: [
      "Keep DATABASE_URL set (Render Postgres or external) so redeploys do not wipe CMS/users.",
      "Use Super Admin → Backup & Restore before major content changes.",
      "Confirm /api/system/db-health shows postgres: true after deploy.",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments (PawaPay)",
    items: [
      "PAWAPAY_API_TOKEN must be set on Render for live charges.",
      "Deposits (receive money) and refunds depend on merchant configuration.",
      "Uganda payouts currently support MTN when PAYOUT is enabled on the merchant; Airtel payout may be unavailable.",
      "Never enable public demo payment completion in production (PAYMENT_DEMO_MODE=false).",
    ],
  },
  {
    icon: Shield,
    title: "Access control",
    items: [
      "Promote staff only via Super Admin → User accounts (role: admin / super_admin).",
      "After promotion, the user should refresh or re-login so the layout loads the new role.",
      "/setup/pawapay is restricted to Super Admins in production.",
    ],
  },
  {
    icon: Server,
    title: "Content & brand",
    items: [
      "Website Content / System Settings: logo, hotline, address, social links, WhatsApp group.",
      "Publish real programs, events, news, and accurate impact numbers — avoid placeholder copy.",
      "Legal pages live at /privacy, /terms, /accessibility. Review yearly with leadership.",
    ],
  },
  {
    icon: Globe,
    title: "Free API keys (see FREE-API-KEYS.md in repo)",
    items: [
      "Maps: OpenStreetMap — no API key.",
      "Google login: Cloud Console → OAuth Web client → origins + redirects for localhost + Render URL.",
      "Cloudinary free: cloud name + unsigned upload preset so images survive redeploys.",
      "PawaPay: sandbox token free for tests; live token needs merchant approval.",
      "Square / MoMo: free sandboxes on their developer portals.",
      "Analytics optional: NEXT_PUBLIC_GA_MEASUREMENT_ID from analytics.google.com.",
    ],
  },
];

export default function SuperAdminOpsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Operations checklist</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Runbook for keeping Patriotic Youths of Uganda professional, secure, and reliable in
          production. Share this with technical leads.
        </p>
      </div>

      <div className="grid gap-6">
        {sections.map((s) => (
          <section
            key={s.title}
            className="rounded-2xl border border-border/50 bg-card p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <s.icon className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold">{s.title}</h2>
            </div>
            <ul className="space-y-2">
              {s.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/super-admin/backup"
          className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
        >
          Backup & Restore <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/super-admin/payments"
          className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
        >
          Payments <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/super-admin/settings"
          className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
        >
          System settings <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
