"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
  WhatsAppIcon,
} from "@/components/ui/social-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/use-cms";
import { BrandLogo } from "@/components/shared/brand-logo";
import { getWhatsAppGroupUrl, DEFAULT_WHATSAPP_GROUP_LABEL } from "@/lib/whatsapp";

const footerLinks = {
  Organization: [
    { href: "/about", label: "About Us" },
    { href: "/about#leadership", label: "Leadership" },
    { href: "/governance", label: "Governance" },
    { href: "/impact", label: "Impact" },
    { href: "/map", label: "Uganda Map" },
    { href: "/contact", label: "Contact" },
  ],
  Programs: [
    { href: "/programs", label: "All Programs" },
    { href: "/programs/leadership-development", label: "Leadership" },
    { href: "/programs/entrepreneurship", label: "Entrepreneurship" },
    { href: "/programs/ict-digital-skills", label: "ICT Skills" },
    { href: "/programs/climate-action", label: "Climate Action" },
  ],
  Engage: [
    { href: "/membership", label: "Become a Member" },
    { href: "/volunteer", label: "Volunteer" },
    { href: "/events", label: "Events" },
    { href: "/donate", label: "Donate" },
    { href: "/careers", label: "Careers" },
  ],
  Resources: [
    { href: "/news", label: "News & Blog" },
    { href: "/faq", label: "FAQ" },
    { href: "/resources", label: "Resource Center" },
    { href: "/press", label: "Press kit" },
    { href: "/gallery", label: "Gallery" },
  ],
};

export function Footer() {
  const pathname = usePathname();
  const { data: site } = useSiteSettings();
  const [email, setEmail] = useState("");

  const whatsappGroupUrl = getWhatsAppGroupUrl(site);
  const whatsappGroupLabel = site?.whatsappGroupLabel || DEFAULT_WHATSAPP_GROUP_LABEL;

  const socials = [
    { href: site?.facebook || "https://facebook.com", icon: FacebookIcon, label: "Facebook" },
    { href: site?.twitter || "https://x.com", icon: TwitterIcon, label: "X (Twitter)" },
    { href: site?.instagram || "https://instagram.com", icon: InstagramIcon, label: "Instagram" },
    { href: site?.linkedin || "https://linkedin.com", icon: LinkedinIcon, label: "LinkedIn" },
    { href: site?.youtube || "https://youtube.com", icon: YoutubeIcon, label: "YouTube" },
    {
      href: whatsappGroupUrl,
      icon: WhatsAppIcon,
      label: "WhatsApp Group",
    },
  ];

  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin");

  if (isDashboard) return null;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Subscribed successfully!", {
      description: "You'll receive updates from Patriotic Youths of Uganda.",
    });
    setEmail("");
  };

  return (
    <footer className="relative border-t border-border/50 bg-card/50">
      {/* Flag stripe */}
      <div className="flag-stripe h-1.5 w-full" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* WhatsApp group emphasis */}
        <div className="py-10 border-b border-border/50">
          <a
            href={whatsappGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl bg-gradient-to-r from-[#075E54] to-[#25D366] p-5 sm:p-6 text-white hover:opacity-95 transition-opacity"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#25D366]">
              <WhatsAppIcon className="h-8 w-8" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">
                Official WhatsApp Community
              </p>
              <p className="text-lg sm:text-xl font-bold mt-0.5">{whatsappGroupLabel}</p>
              <p className="text-sm text-white/85 mt-1">
                {site?.whatsappGroupDescription ||
                  "Connect with patriots nationwide — events, opportunities & updates."}
              </p>
            </div>
            <span className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#075E54] shrink-0">
              Enter Group →
            </span>
          </a>
        </div>

        {/* Newsletter */}
        <div className="py-12 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-md">
              <h3 className="text-xl font-bold">Stay Connected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get the latest news, events, and opportunities delivered to your inbox.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email for newsletter"
                className="flex-1"
              />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </div>

        {/* Links grid */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          <div className="col-span-2">
            <div className="mb-4">
              <BrandLogo href="/" size="xl" showText variant="crest" className="!bg-white/5" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-4">
              {site?.footerAbout ||
                site?.tagline ||
                "Building Uganda Through Unity, Service, Leadership, and Development."}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                {site?.address || "Plot 1, Parliamentary Avenue, Kampala"}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                <a
                  href={`tel:${(site?.hotline || "+256700000000").replace(/\s/g, "")}`}
                  className="hover:text-foreground transition-colors"
                >
                  {site?.hotline || "+256 700 000 000"}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                <a
                  href={`mailto:${site?.supportEmail || "info@pyu.ug"}`}
                  className="hover:text-foreground transition-colors"
                >
                  {site?.supportEmail || "info@pyu.ug"}
                </a>
              </p>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} Patriotic Youths of Uganda. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/accessibility" className="hover:text-foreground transition-colors">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
