"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Users,
  FolderKanban,
  Crown,
  HandHelping,
  Calendar,
  X,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LocationMap } from "@/components/maps/location-map";
import { useCmsCollection, useSiteSettings } from "@/hooks/use-cms";
import type { DistrictStats } from "@/types";
import { formatNumber, cn } from "@/lib/utils";
import {
  resolveDistrictCoords,
  UGANDA_CENTER,
  googleMapsUrl,
} from "@/lib/maps/coords";

export function UgandaMapSection() {
  const { data, isLoading } = useCmsCollection("districts");
  const { data: site } = useSiteSettings();
  const districts = (data as DistrictStats[]) || [];
  const [selected, setSelected] = useState<DistrictStats | null>(null);
  const [search, setSearch] = useState("");

  const resolved = useMemo(() => {
    return districts
      .map((d) => {
        const coords = resolveDistrictCoords(d.name, d.lat, d.lng);
        if (!coords) return null;
        return { ...d, lat: coords.lat, lng: coords.lng };
      })
      .filter(Boolean) as (DistrictStats & { lat: number; lng: number })[];
  }, [districts]);

  const maxMembers = Math.max(1, ...resolved.map((d) => Number(d.members) || 0));

  const circleMarkers = useMemo(
    () =>
      resolved.map((d) => ({
        id: d.name,
        lat: d.lat,
        lng: d.lng,
        title: d.name,
        description: `${d.region} Region\n${formatNumber(d.members)} members · ${d.projects} projects`,
        weight: Math.min(1, (Number(d.members) || 0) / maxMembers),
      })),
    [resolved, maxMembers]
  );

  const filtered = resolved.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.region.toLowerCase().includes(search.toLowerCase())
  );

  const regions = [...new Set(resolved.map((d) => d.region))];

  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Nationwide Presence"
          title="Interactive Uganda Map"
          description={
            site?.mapDescription ||
            "Real map of Uganda — click any district pin to explore membership, projects, leaders, volunteers, and events."
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
                            type="button"
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

              <Link href="/map" className="block">
                <Button variant="outline" className="w-full" size="sm">
                  Open full map
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="lg:col-span-3">
              <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden min-h-[500px]">
                <LocationMap
                  center={UGANDA_CENTER}
                  zoom={7}
                  height={500}
                  scrollWheelZoom
                  fitMarkers
                  selectedId={selected?.name || null}
                  onMarkerClick={(id) => {
                    const d = resolved.find((x) => x.name === id);
                    if (d) setSelected(d);
                  }}
                  circleMarkers={circleMarkers}
                  className="border-0 rounded-none shadow-none min-h-[500px]"
                />

                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute inset-x-4 bottom-4 rounded-2xl border border-border/50 glass-strong p-5 shadow-xl z-[500]"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-emerald-500" />
                            {selected.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selected.region} Region · {selected.lat.toFixed(3)},{" "}
                            {selected.lng.toFixed(3)}
                          </p>
                        </div>
                        <button
                          type="button"
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
                          <div
                            key={stat.label}
                            className="text-center rounded-xl bg-muted/50 p-3"
                          >
                            <stat.icon className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                            <p className="text-lg font-bold">{formatNumber(stat.value)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              {stat.label}
                            </p>
                          </div>
                        ))}
                      </div>
                      <a
                        href={googleMapsUrl(
                          selected.lat,
                          selected.lng,
                          `${selected.name} District Uganda`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        Open in Google Maps <ExternalLink className="h-3 w-3" />
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                OpenStreetMap · {resolved.length} districts with coordinates · scroll to zoom
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
