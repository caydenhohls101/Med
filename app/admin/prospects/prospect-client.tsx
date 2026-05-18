"use client";

import dynamic from "next/dynamic";
import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { addProspect, updateProspectStatus, deleteProspect } from "@/app/actions/prospects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ProspectMap = dynamic(() => import("./prospect-map").then((m) => m.ProspectMap), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

interface SearchResult {
  osmId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  websiteSource: "osm" | "inferred" | "none";
  type: string;
  latitude: number;
  longitude: number;
  inSystem: boolean;
  prospectStatus: string | null;
  priority: "high" | "medium" | "low";
}

interface SavedProspect {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  osm_id: string | null;
}

interface RegisteredPractice {
  id: string; name: string; city: string; slug: string; latitude: number; longitude: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:        { label: "New Lead",   color: "bg-blue-100 text-blue-800" },
  contacted:  { label: "Contacted",  color: "bg-yellow-100 text-yellow-800" },
  interested: { label: "Interested", color: "bg-orange-100 text-orange-800" },
  setup:      { label: "On System",  color: "bg-green-100 text-green-800" },
  declined:   { label: "Declined",   color: "bg-gray-100 text-gray-600" },
};

const PRIORITY_CONFIG = {
  high:   { label: "No website found", dot: "bg-red-500",    badge: "bg-red-100 text-red-800" },
  medium: { label: "Has website",      dot: "bg-orange-400", badge: "bg-orange-100 text-orange-800" },
  low:    { label: "On MediBook",      dot: "bg-green-500",  badge: "bg-green-100 text-green-800" },
};

export function ProspectClient({
  savedProspects,
  registeredPractices,
}: {
  savedProspects: SavedProspect[];
  registeredPractices: RegisteredPractice[];
}) {
  const [tab, setTab] = useState<"discover" | "pipeline">("discover");
  const [locationInput, setLocationInput] = useState("");
  const [radius, setRadius] = useState(3000);
  const [focusSmall, setFocusSmall] = useState(true); // exclude large hospitals by default
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prospects, setProspects] = useState(savedProspects);
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
  // Cache geocoded coords so changing radius re-uses the last lookup without re-geocoding
  const geocacheRef = useRef<{ location: string; lat: string; lon: string } | null>(null);

  async function handleSearch() {
    if (!locationInput.trim()) return;
    setSearching(true);
    setSearchError("");
    setResults([]);
    setSelectedId(null);

    try {
      let lat: string, lon: string;
      const trimmed = locationInput.trim();

      if (geocacheRef.current?.location === trimmed) {
        // Re-use cached coords — only radius changed
        ({ lat, lon } = geocacheRef.current);
      } else {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed + ", South Africa")}&format=json&limit=1&countrycodes=za`,
          { headers: { "User-Agent": "MediBook-SA/1.0" } }
        );
        const geoData = await geoRes.json();
        if (!geoData?.[0]) { setSearchError("Location not found. Try a suburb or city name."); return; }
        ({ lat, lon } = geoData[0]);
        geocacheRef.current = { location: trimmed, lat, lon };
      }

      const res = await fetch(`/api/places/search?lat=${lat}&lon=${lon}&radius=${radius}&focusSmall=${focusSmall}`);
      const data = await res.json();

      if (!res.ok) { setSearchError(data.error ?? "Search failed."); return; }
      const found = data.results ?? [];
      setResults(found);
      if (found.length === 0) {
        const raw = data.rawCount ?? 0;
        setSearchError(
          raw > 0
            ? `Found ${raw} locations but none had a name. Try a different area or increase the radius.`
            : "No medical facilities found. OpenStreetMap data for this area may be sparse — try a larger radius or a major city like Sandton or Cape Town CBD."
        );
      }
    } catch {
      setSearchError("Network error. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleClearSearch() {
    setLocationInput("");
    setSearchError("");
    // Keep results so the user doesn't lose their search
  }

  function handleClearResults() {
    setResults([]);
    setSearchError("");
    setSelectedId(null);
    setLocationInput("");
    geocacheRef.current = null;
  }

  function handleAdd(result: SearchResult) {
    startTransition(async () => {
      const res = await addProspect({
        osmId: result.osmId,
        name: result.name,
        address: result.address ?? undefined,
        phone: result.phone ?? undefined,
        website: result.website ?? undefined,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      // Update search result to show it's been added
      setResults((prev) => prev.map((r) => r.osmId === result.osmId ? { ...r, prospectStatus: "new" } : r));
      // Add immediately to pipeline tab so user sees it without refreshing
      if (res.prospect) {
        setProspects((prev) => {
          const already = prev.some((p) => p.osm_id === result.osmId);
          if (already) return prev;
          return [res.prospect as SavedProspect, ...prev];
        });
      }
    });
  }

  function handleStatusChange(id: string, status: "new" | "contacted" | "interested" | "setup" | "declined") {
    startTransition(async () => {
      await updateProspectStatus(id, status, statusNotes[id]);
      setProspects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProspect(id);
      setProspects((prev) => prev.filter((p) => p.id !== id));
    });
  }

  const filteredResults = results.filter((r) =>
    filter === "all" ? true : r.priority === filter
  );

  const mapProspects = filteredResults
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({ ...r, id: r.osmId }));

  const mapRegistered = registeredPractices.map((p) => ({
    id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude,
    priority: "low" as const, isRegistered: true,
  }));

  const highCount = results.filter((r) => r.priority === "high").length;
  const medCount = results.filter((r) => r.priority === "medium").length;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 104px)" }}>
      {/* Tabs */}
      <div className="border-b bg-background px-6 pt-4 flex items-center gap-6">
        <button
          onClick={() => setTab("discover")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === "discover" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          🔍 Discover New Practices
        </button>
        <button
          onClick={() => setTab("pipeline")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === "pipeline" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          📋 My Pipeline ({prospects.length})
        </button>
      </div>

      {/* ── DISCOVER TAB ── */}
      {tab === "discover" && (
        <div className="flex flex-1 min-h-0">
          {/* Left: search + results */}
          <div className="w-96 shrink-0 flex flex-col border-r bg-background">
            {/* Search controls */}
            <div className="p-4 border-b space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Search Location</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Sandton, Pretoria, Cape Town…"
                      className="text-sm pr-7"
                    />
                    {locationInput && (
                      <button onClick={handleClearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs" aria-label="Clear">✕</button>
                    )}
                  </div>
                  <Button size="sm" onClick={handleSearch} disabled={searching} className="shrink-0">
                    {searching ? "…" : "Search"}
                  </Button>
                </div>
                {results.length > 0 && (
                  <button onClick={handleClearResults} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    ✕ Clear results
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Radius: {(radius / 1000).toFixed(1)} km</Label>
                <input
                  type="range" min={1000} max={20000} step={500}
                  value={radius} onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={focusSmall}
                  onChange={(e) => setFocusSmall(e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Focus on GP &amp; small clinics only (exclude large hospitals)
                </span>
              </label>

              {results.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1 self-center">Filter:</span>
                  {(["all", "high", "medium"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
                    >
                      {f === "all" ? `All (${results.length})` : f === "high" ? `🔴 No website (${highCount})` : `🟠 Has website (${medCount})`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searchError && (
                <div className="p-4 text-sm text-destructive bg-destructive/5 m-3 rounded-lg">{searchError}</div>
              )}
              {!searching && results.length === 0 && !searchError && (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <p className="text-3xl mb-2">🏥</p>
                  <p>Enter a location and click Search to find medical practices in that area.</p>
                  <p className="mt-2 text-xs">Data is sourced from OpenStreetMap.</p>
                </div>
              )}
              {filteredResults.map((result) => {
                const cfg = PRIORITY_CONFIG[result.priority];
                const isSelected = selectedId === result.osmId;
                const alreadyAdded = result.prospectStatus !== null;
                return (
                  <div
                    key={result.osmId}
                    onClick={() => setSelectedId(result.osmId === selectedId ? null : result.osmId)}
                    className={`border-b p-3 cursor-pointer transition-colors ${isSelected ? "bg-primary/5 border-l-4 border-l-primary pl-2" : "hover:bg-muted/40"}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{result.name}</div>
                        {result.address && <div className="text-xs text-muted-foreground">{result.address}</div>}
                        {result.phone && <div className="text-xs text-muted-foreground">{result.phone}</div>}
                        <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.badge} font-medium`}>
                            {result.websiteSource === "inferred"
                              ? "Likely has website"
                              : cfg.label}
                          </span>
                          {result.websiteSource === "inferred" && (
                            <span className="text-xs text-muted-foreground/70 italic">(known chain)</span>
                          )}
                          {result.website && (
                            <a href={result.website.startsWith("http") ? result.website : `https://${result.website}`}
                              target="_blank" rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:underline"
                            >
                              🌐 website
                            </a>
                          )}
                          {result.websiteSource === "none" && (
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(result.name + " " + (result.address ?? "South Africa"))}`}
                              target="_blank" rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 hover:underline"
                              title="Verify on Google before adding to pipeline"
                            >
                              🔍 Verify
                            </a>
                          )}
                        </div>
                        {isSelected && !result.inSystem && (
                          <div className="mt-2">
                            {alreadyAdded ? (
                              <span className="text-xs text-green-700 font-medium">✓ Added to pipeline</span>
                            ) : (
                              <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={(e) => { e.stopPropagation(); handleAdd(result); }}>
                                + Add to Pipeline
                              </Button>
                            )}
                          </div>
                        )}
                        {isSelected && result.inSystem && (
                          <div className="mt-2">
                            <Link href="/dashboard" className="text-xs text-primary hover:underline">View in dashboard →</Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: map */}
          <div className="flex-1 relative">
            <ProspectMap
              prospects={mapProspects}
              registered={mapRegistered}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
            />
            {/* Legend */}
            <div className="absolute top-4 right-4 z-[1000] bg-background/95 backdrop-blur rounded-xl border shadow-lg p-3 text-xs space-y-1.5">
              <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Legend</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> No website (high priority)</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Has website</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> On MediBook already</div>
            </div>
          </div>
        </div>
      )}

      {/* ── PIPELINE TAB ── */}
      {tab === "pipeline" && (
        <div className="flex-1 overflow-y-auto p-6">
          {prospects.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">No prospects yet</p>
              <p className="text-sm mt-1">Use the Discover tab to find practices and add them here.</p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-5xl mx-auto">
              <div className="grid grid-cols-5 gap-3 mb-2">
                {Object.entries(STATUS_LABELS).map(([key, val]) => {
                  const count = prospects.filter((p) => p.status === key).length;
                  return (
                    <div key={key} className={`rounded-xl p-3 text-center ${val.color}`}>
                      <div className="text-xl font-bold">{count}</div>
                      <div className="text-xs font-medium">{val.label}</div>
                    </div>
                  );
                })}
              </div>

              {prospects.map((p) => {
                const statusCfg = STATUS_LABELS[p.status] ?? STATUS_LABELS.new;
                return (
                  <Card key={p.id} className="rounded-xl">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{p.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                            {!p.website && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">No website</span>
                            )}
                          </div>
                          {p.address && <div className="text-sm text-muted-foreground mt-0.5">{p.address}</div>}
                          {p.city && <div className="text-xs text-muted-foreground">{p.city}</div>}
                          {p.phone && <div className="text-sm text-muted-foreground">{p.phone}</div>}
                          {p.website && (
                            <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                              target="_blank" rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              🌐 {p.website}
                            </a>
                          )}
                          {p.notes && (
                            <div className="mt-2 text-sm bg-muted rounded px-2 py-1 italic">
                              &ldquo;{p.notes}&rdquo;
                            </div>
                          )}
                          {/* Notes input */}
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Add notes…"
                              value={statusNotes[p.id] ?? p.notes ?? ""}
                              onChange={(e) => setStatusNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              className="text-xs border rounded px-2 py-1 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          {(["contacted", "interested", "setup", "declined"] as const)
                            .filter((s) => s !== p.status)
                            .map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(p.id, s)}
                                disabled={isPending}
                                className="text-xs px-2.5 py-1 rounded border border-input hover:bg-muted transition-colors disabled:opacity-50 text-left whitespace-nowrap"
                              >
                                → {STATUS_LABELS[s]?.label}
                              </button>
                            ))}
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={isPending}
                            className="text-xs px-2.5 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
