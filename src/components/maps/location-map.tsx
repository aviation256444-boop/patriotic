"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapMarker } from "./location-map-inner";

const LocationMapInner = dynamic(() => import("./location-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-2xl border border-border/50 bg-muted/40">
      <div className="text-center text-muted-foreground text-sm space-y-2">
        <MapPin className="h-6 w-6 mx-auto text-emerald-500 animate-pulse" />
        <p>Loading map…</p>
      </div>
    </div>
  ),
});

export type { MapMarker };

type Props = {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  circleMarkers?: Array<MapMarker & { weight?: number }>;
  className?: string;
  height?: string | number;
  scrollWheelZoom?: boolean;
  showExternalLinks?: boolean;
  fitMarkers?: boolean;
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
};

/**
 * Real OpenStreetMap map (Leaflet). Client-only — safe for Next.js App Router.
 */
export function LocationMap({
  className,
  height = 320,
  ...rest
}: Props) {
  const h = typeof height === "number" ? `${height}px` : height;
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm",
        className
      )}
      style={{ height: h }}
    >
      <LocationMapInner {...rest} height="100%" className="h-full w-full" />
    </div>
  );
}
