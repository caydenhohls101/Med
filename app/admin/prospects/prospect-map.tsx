"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

interface ProspectMarker {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  latitude: number;
  longitude: number;
  priority: "high" | "medium" | "low";
  prospectStatus?: string | null;
  inSystem?: boolean;
  isRegistered?: boolean;
}

const COLORS = {
  high:   { fill: "#EF4444", stroke: "#B91C1C" },   // red — no website
  medium: { fill: "#F97316", stroke: "#C2410C" },   // orange — has website
  low:    { fill: "#22C55E", stroke: "#15803D" },   // green — on MediBook
};

function FlyTo({ id, markers }: { id: string | null; markers: ProspectMarker[] }) {
  const map = useMap();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (!id || id === prev.current) return;
    const m = markers.find((x) => x.id === id);
    if (m) { map.flyTo([m.latitude, m.longitude], 16, { duration: 1 }); prev.current = id; }
  }, [id, markers, map]);
  return null;
}

export function ProspectMap({
  prospects,
  registered,
  selectedId,
  onSelect,
}: {
  prospects: ProspectMarker[];
  registered: ProspectMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const all = [...prospects, ...registered];
  const center: [number, number] = prospects[0]
    ? [prospects[0].latitude, prospects[0].longitude]
    : [-29.0, 25.0];

  return (
    <MapContainer
      center={center}
      zoom={prospects.length ? 13 : 6}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo id={selectedId} markers={all} />

      {/* Registered practices (green, smaller) */}
      {registered.map((r) => (
        <CircleMarker
          key={`reg-${r.id}`}
          center={[r.latitude, r.longitude]}
          radius={8}
          pathOptions={{ fillColor: COLORS.low.fill, fillOpacity: 0.7, color: COLORS.low.stroke, weight: 2 }}
        >
          <Popup maxWidth={200} closeButton={false}>
            <div className="text-sm">
              <p className="font-bold">{r.name}</p>
              <p className="text-xs text-green-700 font-medium">✓ On MediBook</p>
              <Link href={`/browse/${(r as any).slug ?? ""}`} className="text-xs text-blue-600 hover:underline block mt-1">
                View listing →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Prospect markers */}
      {prospects.map((p) => {
        const c = COLORS[p.priority];
        const isSelected = selectedId === p.id;
        return (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={isSelected ? 14 : 10}
            pathOptions={{
              fillColor: c.fill,
              fillOpacity: isSelected ? 1 : 0.75,
              color: c.stroke,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Popup maxWidth={220} closeButton={false}>
              <div className="py-1 space-y-1">
                <p className="font-bold text-sm">{p.name}</p>
                {p.address && <p className="text-xs text-gray-500">{p.address}</p>}
                {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                {p.website ? (
                  <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline block"
                  >
                    🌐 {p.website}
                  </a>
                ) : (
                  <p className="text-xs text-red-600 font-medium">⚠ No website — great prospect!</p>
                )}
                {p.prospectStatus && (
                  <p className="text-xs text-green-700">✓ In your pipeline</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
