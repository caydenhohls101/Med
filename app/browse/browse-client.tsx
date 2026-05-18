"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { MapPractice } from "@/components/map/practice-map";
import { Search, Building2, MapPin, Map, ChevronRight, X } from "lucide-react";

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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
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
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
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
                className={`glass-btn w-full text-left border-b p-4 flex items-start gap-3 group rounded-none ${
                  isSelected
                    ? "bg-primary/8 border-l-4 border-l-primary pl-3"
                    : ""
                }`}
              >
                {/* Colored avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 shadow-sm transition-transform duration-200 group-hover:scale-110 ${isSelected ? "scale-110" : ""}`}
                  style={{ backgroundColor: color }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-primary" : ""}`}>
                    {p.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.suburb}, {p.city}
                  </div>
                  {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
                  {p.latitude != null && <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium"><MapPin className="w-2.5 h-2.5" /> On map</span>}
                </div>
                {/* Arrow always visible, shifts on hover/selected */}
                <ChevronRight className={`w-4 h-4 text-primary shrink-0 self-center transition-transform duration-200 group-hover:translate-x-1 ${isSelected ? "translate-x-1" : "translate-x-0 opacity-40"}`} />
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
                      className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
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
            <Map className="w-14 h-14 opacity-30" />
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
