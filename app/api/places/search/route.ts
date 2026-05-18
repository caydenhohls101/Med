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

// Fetch with a manual timeout compatible with all Next.js environments
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Try multiple Overpass endpoints in case one is down
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

export async function GET(request: NextRequest) {
  // Guard: platform admins only
  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (adminEmails.length > 0) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !adminEmails.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radius = Math.min(Number(searchParams.get("radius") ?? "5000"), 20000);

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  // Broad query covering ALL healthcare-related OSM tags used in South Africa
  // SA data uses a mix of amenity=*, healthcare=*, and office=* tags
  const query = `
[out:json][timeout:25];
(
  node["amenity"="doctors"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  node["amenity"="health_post"](around:${radius},${lat},${lon});
  node["amenity"="nursing_home"](around:${radius},${lat},${lon});
  node["healthcare"](around:${radius},${lat},${lon});
  node["healthcare:speciality"](around:${radius},${lat},${lon});
  node["office"="doctor"](around:${radius},${lat},${lon});
  node["office"="physician"](around:${radius},${lat},${lon});
  way["amenity"="doctors"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});
  way["healthcare"](around:${radius},${lat},${lon});
  way["office"="doctor"](around:${radius},${lat},${lon});
);
out center;
`.trim();

  let overpassData: { elements?: OverpassElement[] } | null = null;
  let lastError = "";

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "MediBook-SA/1.0 (medibook.co.za)",
          },
        },
        25000
      );

      if (!res.ok) {
        lastError = `${endpoint} returned ${res.status}`;
        continue;
      }

      overpassData = await res.json();
      break; // success
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      continue; // try next endpoint
    }
  }

  if (!overpassData) {
    return NextResponse.json(
      { error: `OpenStreetMap is unavailable. ${lastError}` },
      { status: 502 }
    );
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
    .filter((el) => el.tags?.name) // must have a name to be useful
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;

      const name = el.tags.name.trim();
      const website = el.tags.website ?? el.tags["contact:website"] ?? el.tags["url"] ?? null;
      const inSystem = practiceNames.has(name.toLowerCase());
      const prospectStatus = prospectMap.get(String(el.id)) ?? null;

      const priority: "high" | "medium" | "low" = inSystem
        ? "low"
        : !website
        ? "high"
        : "medium";

      const type =
        el.tags.healthcare ??
        el.tags.amenity ??
        el.tags.office ??
        "medical";

      return {
        osmId: String(el.id),
        name,
        address:
          [el.tags["addr:housenumber"], el.tags["addr:street"], el.tags["addr:suburb"] ?? el.tags["addr:city"]]
            .filter(Boolean)
            .join(" ") || null,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? el.tags["contact:mobile"] ?? null,
        website,
        type,
        latitude: elLat,
        longitude: elLon,
        inSystem,
        prospectStatus,
        priority,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a!.priority] - order[b!.priority]) || a!.name.localeCompare(b!.name);
    });

  return NextResponse.json({
    results,
    total: results.length,
    rawCount: elements.length, // for debugging
  });
}
