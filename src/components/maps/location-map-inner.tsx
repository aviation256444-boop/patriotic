"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import { fixLeafletDefaultIcon } from "./fix-leaflet-icon";
import {
  UGANDA_CENTER,
  UGANDA_DEFAULT_ZOOM,
  openStreetMapUrl,
  googleMapsUrl,
} from "@/lib/maps/coords";
import "leaflet/dist/leaflet.css";

export type MapMarker = {
  id?: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  /** When true, use a larger HQ-style pin */
  primary?: boolean;
};

type Props = {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  height?: string;
  scrollWheelZoom?: boolean;
  showExternalLinks?: boolean;
  /** Fit map to all markers when more than one */
  fitMarkers?: boolean;
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  /** Use circle markers sized by weight (0–1) instead of pins */
  circleMarkers?: Array<MapMarker & { weight?: number }>;
};

function FitBounds({
  points,
  enabled,
}: {
  points: [number, number][];
  enabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || points.length < 2) return;
    map.fitBounds(points, { padding: [40, 40], maxZoom: 11 });
  }, [map, points, enabled]);
  return null;
}

function FlyToSelected({
  lat,
  lng,
  active,
}: {
  lat?: number;
  lng?: number;
  active: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active || lat == null || lng == null) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 10), { duration: 0.7 });
  }, [map, lat, lng, active]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 120);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

export default function LocationMapInner({
  center = UGANDA_CENTER,
  zoom = UGANDA_DEFAULT_ZOOM,
  markers = [],
  className,
  height = "100%",
  scrollWheelZoom = false,
  showExternalLinks = true,
  fitMarkers = false,
  selectedId,
  onMarkerClick,
  circleMarkers,
}: Props) {
  fixLeafletDefaultIcon();

  const selected =
    markers.find((m) => m.id && m.id === selectedId) ||
    circleMarkers?.find((m) => m.id && m.id === selectedId);

  const points: [number, number][] = [
    ...markers.map((m) => [m.lat, m.lng] as [number, number]),
    ...(circleMarkers || []).map((m) => [m.lat, m.lng] as [number, number]),
  ];

  const mapCenter: [number, number] =
    markers.length === 1 && !fitMarkers
      ? [markers[0].lat, markers[0].lng]
      : center;

  const mapZoom =
    markers.length === 1 && !circleMarkers?.length ? Math.max(zoom, 13) : zoom;

  return (
    <div className={className} style={{ height, width: "100%", minHeight: 220 }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full rounded-2xl z-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateSize />
        <FitBounds points={points} enabled={fitMarkers && points.length > 1} />
        <FlyToSelected
          lat={selected?.lat}
          lng={selected?.lng}
          active={Boolean(selectedId && selected)}
        />

        {(circleMarkers || []).map((m) => {
          const r = 6 + Math.round((m.weight ?? 0.4) * 16);
          const isSel = m.id && m.id === selectedId;
          return (
            <CircleMarker
              key={m.id || `${m.lat}-${m.lng}`}
              center={[m.lat, m.lng]}
              radius={isSel ? r + 4 : r}
              pathOptions={{
                color: isSel ? "#047857" : "#059669",
                fillColor: isSel ? "#10b981" : "#34d399",
                fillOpacity: isSel ? 0.95 : 0.75,
                weight: isSel ? 3 : 2,
              }}
              eventHandlers={{
                click: () => {
                  if (m.id) onMarkerClick?.(m.id);
                },
              }}
            >
              {(m.title || m.description) && (
                <Popup>
                  <div className="text-sm min-w-[140px]">
                    {m.title && <p className="font-bold text-gray-900">{m.title}</p>}
                    {m.description && (
                      <p className="text-gray-600 mt-1 whitespace-pre-line">
                        {m.description}
                      </p>
                    )}
                    {showExternalLinks && (
                      <div className="mt-2 flex flex-col gap-1 text-xs">
                        <a
                          href={googleMapsUrl(m.lat, m.lng, m.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-semibold"
                        >
                          Open in Google Maps
                        </a>
                        <a
                          href={openStreetMapUrl(m.lat, m.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700"
                        >
                          Open in OpenStreetMap
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}

        {markers.map((m) => (
          <Marker
            key={m.id || `${m.lat}-${m.lng}-pin`}
            position={[m.lat, m.lng]}
            eventHandlers={{
              click: () => {
                if (m.id) onMarkerClick?.(m.id);
              },
            }}
          >
            <Popup>
              <div className="text-sm min-w-[140px]">
                {m.title && <p className="font-bold text-gray-900">{m.title}</p>}
                {m.description && (
                  <p className="text-gray-600 mt-1 whitespace-pre-line">{m.description}</p>
                )}
                {showExternalLinks && (
                  <div className="mt-2 flex flex-col gap-1 text-xs">
                    <a
                      href={googleMapsUrl(m.lat, m.lng, m.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-semibold"
                    >
                      Open in Google Maps
                    </a>
                    <a
                      href={openStreetMapUrl(m.lat, m.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700"
                    >
                      Open in OpenStreetMap
                    </a>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
