"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  badge?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHero({ badge, title, description, className, children }: PageHeroProps) {
  return (
    <section className={cn("relative pt-28 pb-16 sm:pt-32 sm:pb-20 overflow-hidden", className)}>
      <div className="absolute inset-0 gradient-hero" aria-hidden="true" />
      <div className="absolute inset-0 mesh-bg opacity-50" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          {badge && (
            <span className="mb-4 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {badge}
            </span>
          )}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="gradient-text">{title}</span>
          </h1>
          {description && (
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </motion.div>
      </div>
    </section>
  );
}
