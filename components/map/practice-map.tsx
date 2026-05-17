"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export interface MapPractice {
  id: string;
  name: string;
  slug: string;
  suburb: string;
  city: string;
  province?: string;
  phone?: string;
  latitude: number;
  longitude: number;
}

// Build a circular SVG marker with an initial letter and a color
function makeIcon(initial: string, color = "#2563EB") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
      </filter>
      <path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28s20-13 20-28C40 9 31 0 20 0z"
            fill="${color}" filter="url(#s)"/>
      <circle cx="20" cy="20" r="13" fill="white" opacity="0.15"/>
      <text x="20" y="26" text-anchor="middle" font-family="system-ui,sans-serif"
            font-size="14" font-weight="700" fill="white">${initial}</text>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -50],
  });
}

// Component that flies the map to a new position when selectedId changes
function FlyToSelected({
  practices,
  selectedId,
}: {
  practices: MapPractice[];
  selectedId: string | null;
}) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || selectedId === prevId.current) return;
    const p = practices.find((x) => x.id === selectedId);
    if (p) {
      map.flyTo([p.latitude, p.longitude], 15, { duration: 1.2, easeLinearity: 0.5 });
      prevId.current = selectedId;
    }
  }, [selectedId, practices, map]);

  return null;
}

interface Props {
  practices: MapPractice[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  singleMarker?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

// Color palette — cycles through for different practices
const COLORS = ["#2563EB", "#16A34A", "#DC2626", "#9333EA", "#EA580C", "#0891B2", "#BE185D"];

export function PracticeMap({
  practices,
  center,
  zoom = 10,
  height = "100%",
  singleMarker = false,
  selectedId = null,
  onSelect,
}: Props) {
  const defaultCenter: [number, number] = center ?? [-26.2041, 28.0473];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={zoom}
      style={{ height, width: "100%" }}
      scrollWheelZoom
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSelected practices={practices} selectedId={selectedId} />

      {practices.map((p, i) => {
        const color = COLORS[i % COLORS.length]!;
        const icon = makeIcon(p.name.charAt(0).toUpperCase(), color);
        const isSelected = selectedId === p.id;

        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onSelect?.(p.id),
            }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup maxWidth={220} closeButton={false}>
              <div className="py-1">
                <p className="font-bold text-sm leading-tight">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.suburb}, {p.city}
                </p>
                {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                {!singleMarker && (
                  <Link
                    href={`/browse/${p.slug}`}
                    style={{ backgroundColor: color }}
                    className="mt-2 block text-center text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    View &amp; Book →
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
