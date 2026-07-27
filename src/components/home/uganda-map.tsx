"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, FolderKanban, Crown, HandHelping, Calendar, X } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection, useSiteSettings } from "@/hooks/use-cms";
import type { DistrictStats } from "@/types";
import { formatNumber, cn } from "@/lib/utils";

export function UgandaMapSection() {
  const { data, isLoading } = useCmsCollection("districts");
  const { data: site } = useSiteSettings();
  const districts = (data as DistrictStats[]) || [];
  const [selected, setSelected] = useState<DistrictStats | null>(null);
  const [search, setSearch] = useState("");

  const filtered = districts.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.region.toLowerCase().includes(search.toLowerCase())
  );

  const regions = [...new Set(districts.map((d) => d.region))];

  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Nationwide Presence"
          title="Interactive Uganda Map"
          description={
            site?.mapDescription ||
            "Click any district to explore membership, projects, leaders, volunteers, and events."
          }
        />

        {isLoading ? (
          <Skeleton className="h-[500px] rounded-2xl" />
        ) : (
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <input
                type="search"
                placeholder="Search districts or regions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                aria-label="Search districts"
              />

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {regions.map((region) => {
                  const regionDistricts = filtered.filter((d) => d.region === region);
                  if (!regionDistricts.length) return null;
                  return (
                    <div key={region}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 sticky top-0 bg-muted/30 py-1">
                        {region}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {regionDistricts.map((d) => (
                          <button
                            key={d.name}
                            onClick={() => setSelected(d)}
                            className={cn(
                              "rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200",
                              selected?.name === d.name
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                : "border-border/50 bg-card hover:border-emerald-500/30 hover:bg-emerald-500/5"
                            )}
                          >
                            <span className="font-medium flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
                              {d.name}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5 block">
                              {formatNumber(d.members)} members
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden min-h-[500px]">
                <div className="absolute inset-0 gradient-hero opacity-50" />
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                    backgroundSize: "24px 24px",
                  }}
                />

                <div className="relative p-6 h-full min-h-[500px] flex flex-col">
                  <div className="flex-1 relative">
                    {districts.map((d, i) => {
                      const x = ((d.lng - 29.5) / 5.5) * 100;
                      const y = ((4.5 - d.lat) / 6) * 100;
                      const size = Math.max(8, Math.min(24, d.members / 1000));
                      return (
                        <motion.button
                          key={d.name}
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => setSelected(d)}
                          className={cn(
                            "absolute rounded-full transition-all duration-300 hover:z-10",
                            selected?.name === d.name
                              ? "bg-emerald-500 ring-4 ring-emerald-500/30 z-10"
                              : "bg-emerald-500/60 hover:bg-emerald-500 hover:ring-2 hover:ring-emerald-500/30"
                          )}
                          style={{
                            left: `${Math.max(5, Math.min(90, x))}%`,
                            top: `${Math.max(5, Math.min(90, y))}%`,
                            width: size,
                            height: size,
                          }}
                          title={`${d.name}: ${formatNumber(d.members)} members`}
                          aria-label={`View ${d.name} statistics`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Click a district pin or select from the list · {districts.length} districts shown
                  </p>
                </div>

                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute inset-x-4 bottom-4 rounded-2xl border border-border/50 glass-strong p-5 shadow-xl z-20"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-emerald-500" />
                            {selected.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{selected.region} Region</p>
                        </div>
                        <button
                          onClick={() => setSelected(null)}
                          className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { icon: Users, label: "Members", value: selected.members },
                          { icon: FolderKanban, label: "Projects", value: selected.projects },
                          { icon: Crown, label: "Leaders", value: selected.leaders },
                          { icon: HandHelping, label: "Volunteers", value: selected.volunteers },
                          { icon: Calendar, label: "Events", value: selected.events },
                        ].map((stat) => (
                          <div key={stat.label} className="text-center rounded-xl bg-muted/50 p-3">
                            <stat.icon className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                            <p className="text-lg font-bold">{formatNumber(stat.value)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              {stat.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
