import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { queryOverpass } from "@/lib/overpass";

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
out center;`.trim();

  let elements;
  try {
    const result = await queryOverpass(query, 20000);
    elements = result.elements;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[places/nearby]", msg);
    return NextResponse.json({ error: "Map data temporarily unavailable. Try again in a moment." }, { status: 502 });
  }

  // Cross-reference with registered practices
  const supabase = createServiceClient();
  const { data: practices } = await supabase
    .from("practices")
    .select("name, slug, latitude, longitude");

  const registeredNames = new Set((practices ?? []).map((p) => p.name.toLowerCase().trim()));

  const results = elements
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
        osmId: String(el.id), name, isOnMediBook, slug: practice?.slug ?? null,
        address: [el.tags["addr:housenumber"], el.tags["addr:street"], el.tags["addr:suburb"]].filter(Boolean).join(" ") || null,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
        website: el.tags.website ?? null,
        type: el.tags.amenity ?? el.tags.healthcare ?? el.tags.office ?? "medical",
        latitude: elLat, longitude: elLon,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a!.isOnMediBook && !b!.isOnMediBook) return -1;
      if (!a!.isOnMediBook && b!.isOnMediBook) return 1;
      return a!.name.localeCompare(b!.name);
    });

  return NextResponse.json({ results, total: results.length });
}
