import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

export async function GET(request: NextRequest) {
  // Guard: platform admins only
  const supabaseUser = await createClient();
  const { data: { user } } = await supabaseUser.auth.getUser();
  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!user || !adminEmails.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radius = searchParams.get("radius") ?? "5000";

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  // Query OpenStreetMap Overpass API — free, no API key needed
  const query = `[out:json][timeout:30];(
    node["amenity"="doctors"](around:${radius},${lat},${lon});
    node["amenity"="clinic"](around:${radius},${lat},${lon});
    node["healthcare"="doctor"](around:${radius},${lat},${lon});
    node["healthcare"="clinic"](around:${radius},${lat},${lon});
    node["amenity"="hospital"](around:${radius},${lat},${lon});
    way["amenity"="doctors"](around:${radius},${lat},${lon});
    way["amenity"="clinic"](around:${radius},${lat},${lon});
    way["amenity"="hospital"](around:${radius},${lat},${lon});
  );out center;`;

  let overpassData: { elements?: OverpassElement[] };
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
    overpassData = await res.json();
  } catch (err) {
    return NextResponse.json({ error: "Could not reach OpenStreetMap. Try again." }, { status: 502 });
  }

  const elements: OverpassElement[] = overpassData.elements ?? [];

  // Cross-reference with our practices and prospects
  const supabase = createServiceClient();
  const [{ data: practices }, { data: existingProspects }] = await Promise.all([
    supabase.from("practices").select("name, phone"),
    supabase.from("prospects").select("osm_id, status"),
  ]);

  const practiceNames = new Set((practices ?? []).map((p) => p.name.toLowerCase().trim()));
  const prospectMap = new Map((existingProspects ?? []).map((p) => [p.osm_id, p.status]));

  const results = elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;

      const name = el.tags.name.trim();
      const website = el.tags.website ?? el.tags["contact:website"] ?? null;
      const inSystem = practiceNames.has(name.toLowerCase());
      const prospectStatus = prospectMap.get(String(el.id)) ?? null;

      // Priority: high = not on system + no website (best prospect)
      //           medium = not on system but has website
      //           low = already on system
      const priority: "high" | "medium" | "low" = inSystem
        ? "low"
        : !website
        ? "high"
        : "medium";

      return {
        osmId: String(el.id),
        name,
        address: [
          el.tags["addr:housenumber"],
          el.tags["addr:street"],
          el.tags["addr:suburb"] ?? el.tags["addr:city"],
        ]
          .filter(Boolean)
          .join(" ") || null,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? el.tags["contact:mobile"] ?? null,
        website,
        type: el.tags.amenity ?? el.tags.healthcare ?? "medical",
        latitude: elLat,
        longitude: elLon,
        inSystem,
        prospectStatus,
        priority,
      };
    })
    .filter(Boolean)
    // Sort: high priority first, then by name
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a!.priority] - order[b!.priority]) || a!.name.localeCompare(b!.name);
    });

  return NextResponse.json({ results, total: results.length });
}
