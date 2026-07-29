"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, ExternalLink } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LocationMap } from "@/components/maps/location-map";
import { useCmsCollection, useSiteSettings } from "@/hooks/use-cms";
import type { DistrictStats } from "@/types";
import { formatNumber, cn } from "@/lib/utils";
import {
  resolveDistrictCoords,
  UGANDA_CENTER,
  PYU_HQ,
  googleMapsUrl,
} from "@/lib/maps/coords";

export default function MapPage() {
  const { data, isLoading } = useCmsCollection("districts");
  const { data: site } = useSiteSettings();
  const districts = (data as DistrictStats[]) || [];
  const [selected, setSelected] = useState<string | null>(null);
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
  const selectedDistrict = resolved.find((d) => d.name === selected) || null;

  const circleMarkers = useMemo(
    () =>
      resolved.map((d) => ({
        id: d.name,
        lat: d.lat,
        lng: d.lng,
        title: d.name,
        description: `${d.region}\n${formatNumber(d.members)} members`,
        weight: Math.min(1, (Number(d.members) || 0) / maxMembers),
      })),
    [resolved, maxMembers]
  );

  const filtered = resolved.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHero
        badge="Maps"
        title="PYU across Uganda"
        description={
          site?.mapDescription ||
          "Live OpenStreetMap of our districts, plus headquarters location in Kampala."
        }
      />

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <input
                type="search"
                placeholder="Search districts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <div className="rounded-2xl border border-border/50 bg-card p-3 max-h-[520px] overflow-y-auto space-y-1">
                {isLoading && <Skeleton className="h-40 w-full" />}
                {!isLoading && filtered.length === 0 && (
                  <EmptyState
                    title="No districts"
                    description="Add districts with coordinates in Super Admin → Districts Map."
                    className="py-8 border-0"
                  />
                )}
                {filtered.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setSelected(d.name)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      selected === d.name
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <span className="font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      {d.name}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      {d.region} · {formatNumber(d.members)} members
                    </span>
                  </button>
                ))}
              </div>
              <a
                href={googleMapsUrl(PYU_HQ.lat, PYU_HQ.lng, PYU_HQ.query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-3 text-sm hover:border-emerald-500/30"
              >
                <MapPin className="h-4 w-4 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">Headquarters</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {site?.address || "Parliamentary Avenue, Kampala"}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <LocationMap
                center={UGANDA_CENTER}
                zoom={7}
                height={560}
                scrollWheelZoom
                fitMarkers
                selectedId={selected}
                onMarkerClick={setSelected}
                circleMarkers={circleMarkers}
                markers={[
                  {
                    id: "hq",
                    lat: PYU_HQ.lat,
                    lng: PYU_HQ.lng,
                    title: PYU_HQ.label,
                    description: site?.address || "Plot 1, Parliamentary Avenue, Kampala",
                    primary: true,
                  },
                ]}
              />

              {selectedDistrict && (
                <div className="rounded-2xl border border-border/50 bg-card p-5 flex flex-wrap gap-4 items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold">{selectedDistrict.name}</h2>
                      <Badge variant="outline">{selectedDistrict.region}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedDistrict.lat.toFixed(4)}, {selectedDistrict.lng.toFixed(4)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span>
                        <strong>{formatNumber(selectedDistrict.members)}</strong> members
                      </span>
                      <span>
                        <strong>{selectedDistrict.projects}</strong> projects
                      </span>
                      <span>
                        <strong>{selectedDistrict.events}</strong> events
                      </span>
                      <span>
                        <strong>{selectedDistrict.volunteers}</strong> volunteers
                      </span>
                    </div>
                  </div>
                  <a
                    href={googleMapsUrl(
                      selectedDistrict.lat,
                      selectedDistrict.lng,
                      `${selectedDistrict.name} Uganda`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline"
                  >
                    Google Maps <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Map data ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OpenStreetMap
                </a>{" "}
                contributors. District pins size reflects relative membership.{" "}
                <Link href="/contact" className="text-emerald-600 hover:underline">
                  Contact HQ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
