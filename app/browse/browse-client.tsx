"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { MapPractice } from "@/components/map/practice-map";

const PracticeMap = dynamic(
  () => import("@/components/map/practice-map").then((m) => m.PracticeMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center text-muted-foreground text-sm">
        Loading map…
      </div>
    ),
  }
);

interface Practice {
  id: string;
  name: string;
  slug: string;
  suburb: string;
  city: string;
  province: string;
  phone: string | null;
  address_line1: string | null;
  latitude: number | null;
  longitude: number | null;
}

const COLORS = ["#2563EB", "#16A34A", "#DC2626", "#9333EA", "#EA580C", "#0891B2", "#BE185D"];

export function BrowseClient({ practices }: { practices: Practice[] }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return practices;
    return practices.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.suburb.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q)
    );
  }, [practices, search]);

  const mappable = useMemo(
    () =>
      filtered.filter(
        (p): p is Practice & { latitude: number; longitude: number } =>
          p.latitude != null && p.longitude != null
      ) as MapPractice[],
    [filtered]
  );

  const selectedPractice = filtered.find((p) => p.id === selectedId);

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex" style={{ height: "calc(100vh - 56px)" }}>
      {/* ── Left panel: search + list ── */}
      <div className="w-80 shrink-0 flex flex-col border-r bg-background z-10">
        {/* Search */}
        <div className="p-3 border-b bg-background">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by name, city or suburb…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            {filtered.length} {filtered.length === 1 ? "practice" : "practices"} found
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <p className="text-2xl mb-2">🏥</p>
              <p>No practices found.</p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-primary hover:underline mt-2 text-xs"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
          {filtered.map((p, i) => {
            const color = COLORS[i % COLORS.length]!;
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`w-full text-left border-b transition-colors p-4 flex items-start gap-3 ${
                  isSelected ? "bg-primary/5 border-l-4 border-l-primary pl-3" : "hover:bg-muted/50"
                }`}
              >
                {/* Avatar circle */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5"
                  style={{ backgroundColor: color }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm leading-tight">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.suburb}, {p.city}
                  </div>
                  {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
                  {p.latitude == null && (
                    <span className="text-xs text-muted-foreground/60 italic">No map location</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: map ── */}
      <div className="flex-1 relative">
        {mappable.length > 0 ? (
          <>
            <PracticeMap
              practices={mappable}
              zoom={6}
              center={[-29.0, 25.0]}
              height="100%"
              selectedId={selectedId}
              onSelect={handleSelect}
            />

            {/* Selected practice card (floating bottom of map) */}
            {selectedPractice && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
                <div className="bg-background rounded-xl border shadow-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-base">{selectedPractice.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedPractice.suburb}, {selectedPractice.city}
                      </div>
                      {selectedPractice.phone && (
                        <div className="text-sm text-muted-foreground">{selectedPractice.phone}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0 mt-0.5"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/browse/${selectedPractice.slug}`}
                      className="flex-1 text-center bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      View Practice
                    </Link>
                    <Link
                      href={`/book/${selectedPractice.slug}`}
                      className="flex-1 text-center border border-primary text-primary text-sm font-semibold py-2 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="text-sm font-medium">No practices on the map yet</p>
            <p className="text-xs">Practices appear here once they add their address during signup</p>
            <Link
              href="/signup/practice"
              className="mt-2 text-sm text-primary hover:underline font-medium"
            >
              Register your practice →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
