import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface OverpassElement {
  type: string; id: number;
  lat?: number; lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

async function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Public endpoint — patients search for ALL nearby medical facilities
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat    = searchParams.get("lat");
  const lon    = searchParams.get("lon");
  const radius = Math.min(Number(searchParams.get("radius") ?? "3000"), 10000);

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  const query = `
[out:json][timeout:20];
(
  node["amenity"="doctors"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  node["healthcare"="doctor"](around:${radius},${lat},${lon});
  node["healthcare"="clinic"](around:${radius},${lat},${lon});
  node["healthcare"="general_practitioner"](around:${radius},${lat},${lon});
  node["office"="doctor"](around:${radius},${lat},${lon});
  way["amenity"="doctors"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
);
out center;
`.trim();

  let overpassData: { elements?: OverpassElement[] } | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "MediBook-SA/1.0" },
      }, 20000);
      if (!res.ok) continue;
      overpassData = await res.json();
      break;
    } catch { continue; }
  }

  if (!overpassData) {
    return NextResponse.json({ error: "Map data unavailable. Try again." }, { status: 502 });
  }

  // Cross-reference with registered practices
  const supabase = createServiceClient();
  const { data: practices } = await supabase
    .from("practices")
    .select("name, slug, latitude, longitude");

  const registeredNames = new Set((practices ?? []).map((p) => p.name.toLowerCase().trim()));

  const results = (overpassData.elements ?? [])
    .filter((el) => el.tags?.name)
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;
      const name = el.tags.name.trim();
      const isOnMediBook = registeredNames.has(name.toLowerCase());
      const practice = isOnMediBook
        ? (practices ?? []).find((p) => p.name.toLowerCase() === name.toLowerCase())
        : null;

      return {
        osmId: String(el.id),
        name,
        address: [el.tags["addr:housenumber"], el.tags["addr:street"], el.tags["addr:suburb"]]
          .filter(Boolean).join(" ") || null,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
        website: el.tags.website ?? null,
        type: el.tags.amenity ?? el.tags.healthcare ?? el.tags.office ?? "medical",
        latitude: elLat,
        longitude: elLon,
        isOnMediBook,
        slug: practice?.slug ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Registered practices first, then by name
      if (a!.isOnMediBook && !b!.isOnMediBook) return -1;
      if (!a!.isOnMediBook && b!.isOnMediBook) return 1;
      return a!.name.localeCompare(b!.name);
    });

  return NextResponse.json({ results, total: results.length });
}
