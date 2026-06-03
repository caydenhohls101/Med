"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback } from "react";
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
  id: string; name: string; slug: string; suburb: string; city: string;
  province: string; phone: string | null; address_line1: string | null;
  latitude: number | null; longitude: number | null;
}

const COLORS = ["#2563EB","#16A34A","#DC2626","#9333EA","#EA580C","#0891B2","#BE185D"];

// Haversine distance in km
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function BrowseClient({ practices }: { practices: Practice[] }) {
  const [search, setSearch]         = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Location state
  const [userLoc, setUserLoc]           = useState<{ lat: number; lon: number } | null>(null);
  const [locLoading, setLocLoading]     = useState(false);
  const [locError, setLocError]         = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [geocoding, setGeocoding]       = useState(false);

  // Explore nearby (Overpass — includes unregistered practices)
  const [exploring, setExploring]     = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<{
    osmId: string; name: string; address: string | null; phone: string | null;
    website: string | null; latitude: number; longitude: number;
    isOnMediBook: boolean; slug: string | null;
  }[]>([]);
  const [nearbyError, setNearbyError] = useState("");

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) { setLocError("Geolocation is not supported by your browser."); return; }
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocLoading(false);
      },
      () => {
        setLocError("Location access denied — search manually below.");
        setLocLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  async function exploreNearby() {
    if (!userLoc) return;
    setNearbyLoading(true);
    setNearbyError("");
    try {
      const res = await fetch(`/api/places/nearby?lat=${userLoc.lat}&lon=${userLoc.lon}&radius=5000`);
      const data = await res.json();
      if (!res.ok) { setNearbyError(data.error ?? "Search failed."); return; }
      setNearbyResults(data.results ?? []);
    } catch { setNearbyError("Network error. Try again."); }
    finally { setNearbyLoading(false); }
  }

  async function geocodeManual() {
    if (!manualSearch.trim()) return;
    setGeocoding(true);
    setLocError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualSearch + ", South Africa")}&format=json&limit=1&countrycodes=za`,
        { headers: { "User-Agent": "MediBook-SA/1.0" } }
      );
      const data = await res.json();
      if (data?.[0]) {
        setUserLoc({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        setLocError("");
      } else {
        setLocError("Location not found. Try a suburb or city name.");
      }
    } catch {
      setLocError("Could not geocode. Check your connection.");
    } finally {
      setGeocoding(false);
    }
  }

  // Practices with distance, filtered and sorted
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = practices.filter((p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.suburb.toLowerCase().includes(q) ||
      p.province.toLowerCase().includes(q)
    );

    if (userLoc) {
      list = list
        .map((p) => ({
          ...p,
          _dist: p.latitude && p.longitude
            ? distanceKm(userLoc.lat, userLoc.lon, p.latitude, p.longitude)
            : Infinity,
        }))
        .sort((a, b) => (a as any)._dist - (b as any)._dist) as typeof list;
    }
    return list;
  }, [practices, search, userLoc]);

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
    <div className="flex h-full">
      {/* ── Left panel: search + list ── */}
      <div className="w-80 shrink-0 flex flex-col border-r bg-background z-10">

        {/* Search bar */}
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, city or suburb…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
            )}
          </div>

          {/* Location controls */}
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <button
                onClick={requestGeolocation}
                disabled={locLoading}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors flex-1 justify-center ${
                  userLoc
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground hover:text-primary hover:border-primary/40"
                }`}
              >
                {locLoading ? "⏳" : "📍"}{" "}
                {locLoading ? "Getting location…" : userLoc ? "Location active" : "Use my location"}
              </button>
              {userLoc && (
                <button
                  onClick={() => { setUserLoc(null); setLocError(""); setManualSearch(""); }}
                  className="text-xs px-2 py-1.5 rounded-lg border hover:bg-muted text-muted-foreground"
                  title="Clear location"
                >✕</button>
              )}
            </div>

            {/* Manual search */}
            {!userLoc && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Or enter suburb / city…"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && geocodeManual()}
                  className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={geocodeManual}
                  disabled={geocoding || !manualSearch.trim()}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {geocoding ? "…" : "Go"}
                </button>
              </div>
            )}

            {locError && <p className="text-xs text-destructive">{locError}</p>}

          {/* Explore nearby button — shows Overpass results including unregistered */}
          {userLoc && !exploring && (
            <button
              onClick={() => { setExploring(true); exploreNearby(); }}
              className="w-full text-xs text-center py-2 rounded-lg border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors font-medium"
            >
              🔍 Explore all nearby doctors (including off-MediBook)
            </button>
          )}
          {exploring && (
            <button
              onClick={() => { setExploring(false); setNearbyResults([]); setNearbyError(""); }}
              className="w-full text-xs text-center py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              ✕ Hide nearby exploration
            </button>
          )}
          </div>

          <p className="text-xs text-muted-foreground">
            {exploring && nearbyResults.length > 0
              ? `${nearbyResults.filter(r => r.isOnMediBook).length} on MediBook · ${nearbyResults.filter(r => !r.isOnMediBook).length} nearby not listed`
              : `${filtered.length} ${filtered.length === 1 ? "practice" : "practices"}${userLoc ? " · sorted by distance" : ""}`
            }
          </p>
        </div>

        {/* Practice list */}
        <div className="flex-1 overflow-y-auto" key={exploring ? "explore" : "registered"}>
          {/* Nearby exploration results (Overpass) */}
          {exploring && (
            <div>
              {nearbyLoading && (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                  Searching nearby doctors…
                </div>
              )}
              {nearbyError && <div className="p-4 text-xs text-destructive">{nearbyError}</div>}
              {!nearbyLoading && nearbyResults.length > 0 && (
                <>
                  {/* Registered ones first */}
                  {nearbyResults.filter(r => r.isOnMediBook).map((r) => (
                    <Link key={r.osmId} href={`/browse/${r.slug}`} className="glass-btn flex gap-3 p-3 border-b items-start group">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">{r.name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.address ?? "—"}</div>
                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded-full font-semibold">✓ On MediBook — Book now</span>
                      </div>
                    </Link>
                  ))}
                  {/* Divider */}
                  {nearbyResults.some(r => !r.isOnMediBook) && (
                    <div className="px-4 py-2 bg-muted/20 border-b">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Not yet on MediBook</p>
                    </div>
                  )}
                  {/* Unregistered ones */}
                  {nearbyResults.filter(r => !r.isOnMediBook).map((r) => (
                    <div key={r.osmId} className="flex gap-3 p-3 border-b items-start opacity-80">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">{r.name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-muted-foreground">{r.name}</div>
                        <div className="text-xs text-muted-foreground/70">{r.address ?? r.phone ?? "—"}</div>
                        {r.phone && <div className="text-xs text-muted-foreground/70">{r.phone}</div>}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Hi! I found ${r.name} on MediBook — they could benefit from listing their practice at medibook.co.za`)}`}
                          target="_blank" rel="noreferrer"
                          className="text-[10px] text-primary hover:underline mt-0.5 block"
                        >
                          💬 Share MediBook with them
                        </a>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {!nearbyLoading && nearbyResults.length === 0 && !nearbyError && (
                <div className="p-6 text-center text-sm text-muted-foreground">No nearby practices found in map data.</div>
              )}
              <div className="h-px" />
            </div>
          )}

          {!exploring && filtered.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No practices found.</p>
              {search && <button onClick={() => setSearch("")} className="text-primary hover:underline text-xs mt-2 block mx-auto">Clear search</button>}
            </div>
          )}
          {!exploring && filtered.map((p, i) => {
            const color = COLORS[i % COLORS.length]!;
            const isSelected = selectedId === p.id;
            const dist = userLoc && p.latitude && p.longitude
              ? distanceKm(userLoc.lat, userLoc.lon, p.latitude, p.longitude)
              : null;

            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`glass-btn w-full text-left border-b p-4 flex items-start gap-3 group rounded-none ${
                  isSelected ? "bg-primary/8 border-l-4 border-l-primary pl-3" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 shadow-sm transition-transform duration-200 group-hover:scale-110 ${isSelected ? "scale-110" : ""}`}
                  style={{ backgroundColor: color }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-primary" : ""}`}>{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[p.suburb, p.city].filter(Boolean).join(", ")}
                  </div>
                  {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
                  {dist !== null && (
                    <div className="text-xs text-primary font-semibold mt-0.5">📍 {formatDist(dist)} away</div>
                  )}
                </div>
                <span className={`text-primary text-sm font-bold shrink-0 self-center transition-transform duration-200 group-hover:translate-x-1 ${isSelected ? "translate-x-1 opacity-100" : "opacity-40"}`}>
                  →
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: map ── */}
      <div className="flex-1 relative">
        {mappable.length > 0 || userLoc ? (
          <>
            <PracticeMap
              practices={mappable}
              zoom={userLoc ? 12 : 6}
              center={userLoc ? [userLoc.lat, userLoc.lon] : [-29.0, 25.0]}
              height="100%"
              selectedId={selectedId}
              onSelect={handleSelect}
              userLocation={userLoc ?? undefined}
            />

            {/* Selected practice floating card */}
            {selectedPractice && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
                <div className="bg-background rounded-xl border shadow-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-base">{selectedPractice.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {[selectedPractice.suburb, selectedPractice.city].filter(Boolean).join(", ")}
                      </div>
                      {selectedPractice.phone && <div className="text-sm text-muted-foreground">{selectedPractice.phone}</div>}
                      {userLoc && selectedPractice.latitude && selectedPractice.longitude && (
                        <div className="text-sm font-semibold text-primary mt-0.5">
                          📍 {formatDist(distanceKm(userLoc.lat, userLoc.lon, selectedPractice.latitude, selectedPractice.longitude))} away
                        </div>
                      )}
                    </div>
                    <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0 mt-0.5" aria-label="Close">✕</button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link href={`/browse/${selectedPractice.slug}`} className="flex-1 text-center bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors">
                      View Practice
                    </Link>
                    <Link href={`/book/${selectedPractice.slug}`} className="flex-1 text-center border border-primary text-primary text-sm font-semibold py-2 rounded-lg hover:bg-primary/5 transition-colors">
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
            <p className="text-xs">Practices appear here once they add their address</p>
            <Link href="/signup/practice" className="mt-2 text-sm text-primary hover:underline font-medium">Register your practice →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
