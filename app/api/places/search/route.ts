import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { queryOverpass } from "@/lib/overpass";

const SA_KNOWN_CHAINS = [
  "life ","life healthcare","netcare","mediclinic","intercare","busamed","lenmed",
  "capio","medi-cross","medicross","clicks clinic","clicks pharmacy","dis-chem",
  "dischem","lancet","pathcare","ampath","nhls","national health laboratory",
  "discovery health","momentum health","medi-city","medicity",
];

function likelyHasWebsite(name: string, type: string): boolean {
  const lower = name.toLowerCase();
  if (type === "hospital") return true;
  if (SA_KNOWN_CHAINS.some((c) => lower.includes(c))) return true;
  if (/\bhospital\b/.test(lower) || /\bmedical cent(re|er)\b/.test(lower)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  // Admin guard
  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (adminEmails.length > 0) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !adminEmails.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const lat        = searchParams.get("lat");
  const lon        = searchParams.get("lon");
  const radius     = Math.min(Number(searchParams.get("radius") ?? "5000"), 20000);
  const focusSmall = searchParams.get("focusSmall") !== "false";

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const hospitalClause = focusSmall ? "" : `
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});`;

  const query = `
[out:json][timeout:20];
(
  node["amenity"="doctors"](around:${radius},${lat},${lon});
  node["amenity"="clinic"](around:${radius},${lat},${lon});
  node["amenity"="health_post"](around:${radius},${lat},${lon});
  node["healthcare"="doctor"](around:${radius},${lat},${lon});
  node["healthcare"="clinic"](around:${radius},${lat},${lon});
  node["healthcare"="general_practitioner"](around:${radius},${lat},${lon});
  node["healthcare"="specialist"](around:${radius},${lat},${lon});
  node["office"="doctor"](around:${radius},${lat},${lon});
  node["office"="physician"](around:${radius},${lat},${lon});
  way["amenity"="doctors"](around:${radius},${lat},${lon});
  way["amenity"="clinic"](around:${radius},${lat},${lon});
  way["healthcare"="doctor"](around:${radius},${lat},${lon});
  way["office"="doctor"](around:${radius},${lat},${lon});${hospitalClause}
);
out center;`.trim();

  let elements;
  try {
    const result = await queryOverpass(query, 20000);
    elements = result.elements;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OpenStreetMap unavailable";
    console.error("[places/search]", msg);
    return NextResponse.json({ error: "OpenStreetMap is temporarily unavailable. Try again in a moment." }, { status: 502 });
  }

  const supabase = createServiceClient();
  const [{ data: practices }, { data: existingProspects }] = await Promise.all([
    supabase.from("practices").select("name, phone"),
    supabase.from("prospects").select("osm_id, status"),
  ]);

  const practiceNames = new Set((practices ?? []).map((p) => p.name.toLowerCase().trim()));
  const prospectMap   = new Map((existingProspects ?? []).map((p) => [p.osm_id, p.status]));

  const results = elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;

      const name         = el.tags.name.trim();
      const osmWebsite   = el.tags.website ?? el.tags["contact:website"] ?? el.tags["url"] ?? null;
      const type         = el.tags.healthcare ?? el.tags.amenity ?? el.tags.office ?? "medical";
      const inSystem     = practiceNames.has(name.toLowerCase());
      const prospectStatus = prospectMap.get(String(el.id)) ?? null;
      const hasWebsite   = osmWebsite !== null || likelyHasWebsite(name, type);
      const websiteSource: "osm"|"inferred"|"none" = osmWebsite ? "osm" : likelyHasWebsite(name, type) ? "inferred" : "none";
      const priority: "high"|"medium"|"low" = inSystem ? "low" : !hasWebsite ? "high" : "medium";

      return {
        osmId: String(el.id), name, website: osmWebsite, websiteSource, type,
        address: [el.tags["addr:housenumber"], el.tags["addr:street"], el.tags["addr:suburb"] ?? el.tags["addr:city"]].filter(Boolean).join(" ") || null,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? el.tags["contact:mobile"] ?? null,
        latitude: elLat, longitude: elLon, inSystem, prospectStatus, priority,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a!.priority] - order[b!.priority]) || a!.name.localeCompare(b!.name);
    });

  return NextResponse.json({ results, total: results.length, rawCount: elements.length });
}
