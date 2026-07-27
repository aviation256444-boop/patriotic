"use client";

import { motion } from "framer-motion";
import { Users, MapPin, FolderKanban, HandHelping, Calendar } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useNationalStats } from "@/hooks/use-cms";
import { Skeleton } from "@/components/ui/skeleton";

export function Stats() {
  const { data: stats, isLoading } = useNationalStats();

  const items = [
    { label: "Members", value: stats?.members ?? 0, icon: Users, color: "text-emerald-500" },
    { label: "Districts", value: stats?.districts ?? 0, icon: MapPin, color: "text-yellow-500" },
    { label: "Projects", value: stats?.projects ?? 0, icon: FolderKanban, color: "text-red-500" },
    { label: "Volunteers", value: stats?.volunteers ?? 0, icon: HandHelping, color: "text-blue-500" },
    { label: "Events", value: stats?.events ?? 0, icon: Calendar, color: "text-purple-500" },
  ];

  return (
    <section className="relative py-16 sm:py-20 -mt-8 z-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {isLoading
            ? items.map((item) => (
                <Skeleton key={item.label} className="h-28 rounded-2xl" />
              ))
            : items.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-5 sm:p-6 text-center hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group"
                >
                  <item.icon
                    className={`h-6 w-6 mx-auto mb-3 ${item.color} transition-transform group-hover:scale-110`}
                  />
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                    <AnimatedCounter value={item.value} />
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                    {item.label}
                  </p>
                </motion.div>
              ))}
        </motion.div>
      </div>
    </section>
  );
}
