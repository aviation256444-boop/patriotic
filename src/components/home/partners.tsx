"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import type { Partner } from "@/types";

export function Partners() {
  const { data, isLoading } = useCmsCollection("partners");
  const partners = (data as Partner[]) || [];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Partners"
          title="Trusted Collaborators"
          description="Working hand-in-hand with government, development partners, and the private sector."
        />

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {partners.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card p-6 h-28 hover:border-emerald-500/30 hover:shadow-md transition-all duration-300"
              >
                {p.logo && (p.logo.startsWith("http") || p.logo.startsWith("/")) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo} alt={p.name} className="h-10 w-auto object-contain mb-2 max-w-[80%]" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-yellow-500/20 mb-2">
                    <span className="text-xs font-bold text-emerald-600">
                      {p.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 3)}
                    </span>
                  </div>
                )}
                <p className="text-xs font-medium text-center text-muted-foreground line-clamp-2">
                  {p.name}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
