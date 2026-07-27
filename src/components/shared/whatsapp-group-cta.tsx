"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Users, ArrowRight, Sparkles } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { useSiteSettings } from "@/hooks/use-cms";
import {
  DEFAULT_WHATSAPP_GROUP,
  DEFAULT_WHATSAPP_GROUP_DESCRIPTION,
  DEFAULT_WHATSAPP_GROUP_LABEL,
  getWhatsAppGroupUrl,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppGroupCTAProps {
  variant?: "banner" | "card" | "inline" | "hero";
  className?: string;
}

export function WhatsAppGroupCTA({
  variant = "banner",
  className,
}: WhatsAppGroupCTAProps) {
  const { data: site } = useSiteSettings();
  const url = getWhatsAppGroupUrl(site);
  const label = site?.whatsappGroupLabel || DEFAULT_WHATSAPP_GROUP_LABEL;
  const description =
    site?.whatsappGroupDescription || DEFAULT_WHATSAPP_GROUP_DESCRIPTION;

  if (variant === "hero") {
    return (
      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className={cn(
          "group relative flex w-full max-w-xl items-center gap-4 overflow-hidden rounded-2xl border-2 border-[#25D366]/50 bg-gradient-to-r from-[#128C7E] via-[#25D366] to-[#128C7E] p-4 sm:p-5 text-white shadow-xl shadow-[#25D366]/25 hover:shadow-[#25D366]/40 transition-all hover:scale-[1.02] animate-pulse-glow",
          className
        )}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <WhatsAppIcon className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/90">
            <Sparkles className="h-3 w-3" /> Official Community
          </p>
          <p className="font-bold text-base sm:text-lg leading-tight mt-0.5">{label}</p>
          <p className="text-xs sm:text-sm text-white/85 mt-1 line-clamp-2">{description}</p>
        </div>
        <ArrowRight className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1" />
      </motion.a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] transition-all hover:scale-105",
          className
        )}
      >
        <WhatsAppIcon className="h-5 w-5" />
        {label}
        <ArrowRight className="h-4 w-4" />
      </a>
    );
  }

  if (variant === "card") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block rounded-2xl border-2 border-[#25D366]/40 bg-gradient-to-br from-[#25D366]/15 via-[#25D366]/5 to-transparent p-6 hover:border-[#25D366] hover:shadow-lg hover:shadow-[#25D366]/15 transition-all group",
          className
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md">
            <WhatsAppIcon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#128C7E] dark:text-[#25D366]">
              Join thousands of patriots
            </p>
            <h3 className="text-lg font-bold mt-1 group-hover:text-[#128C7E] dark:group-hover:text-[#25D366] transition-colors">
              {label}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#128C7E] dark:text-[#25D366]">
              Enter the group now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </a>
    );
  }

  // banner (default) — full-width homepage section
  return (
    <section className={cn("py-10 sm:py-14", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="group relative flex flex-col sm:flex-row items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] p-6 sm:p-10 text-white shadow-2xl shadow-[#25D366]/20 hover:shadow-[#25D366]/35 transition-shadow"
        >
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-black blur-3xl" />
          </div>

          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20">
            <WhatsAppIcon className="h-11 w-11" />
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex h-5 w-5 rounded-full bg-yellow-400" />
            </span>
          </div>

          <div className="relative flex-1 text-center sm:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-3">
              <Users className="h-3.5 w-3.5" />
              Official WhatsApp Community
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              {label}
            </h2>
            <p className="mt-3 text-base sm:text-lg text-white/90 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>

          <div className="relative shrink-0">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-bold text-[#075E54] shadow-lg group-hover:scale-105 transition-transform">
              Enter Group
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </motion.a>
      </div>
    </section>
  );
}

/** Floating WhatsApp button — always visible on public pages */
export function WhatsAppFloatingButton() {
  const pathname = usePathname();
  const { data: site } = useSiteSettings();
  const url = getWhatsAppGroupUrl(site) || DEFAULT_WHATSAPP_GROUP;
  const label = site?.whatsappGroupLabel || DEFAULT_WHATSAPP_GROUP_LABEL;

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/auth")
  ) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-[#25D366] pl-3 pr-4 py-3 text-white shadow-xl shadow-[#25D366]/40 hover:bg-[#20bd5a] hover:scale-105 transition-all group md:bottom-6 md:right-24"
    >
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#25D366]">
        <WhatsAppIcon className="h-6 w-6" />
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-400" />
        </span>
      </span>
      <span className="hidden sm:inline text-sm font-bold max-w-[140px] leading-tight">
        Join WhatsApp Group
      </span>
    </a>
  );
}
