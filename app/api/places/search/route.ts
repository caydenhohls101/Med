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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// SA hospital groups & large chains — always have websites, not viable prospects
const SA_KNOWN_CHAINS = [
  "life ", "life healthcare",
  "netcare",
  "mediclinic",
  "intercare",
  "busamed",
  "lenmed",
  "capio",
  "medi-cross", "medicross",
  "clicks clinic", "clicks pharmacy",
  "dis-chem", "dischem",
  "lancet", "lancet laboratories",
  "pathcare",
  "ampath",
  "nhls", "national health laboratory",
  "discovery health",
  "momentum health",
  "medi-city", "medicity",
  "medi-clinic",
  "greenacres hospital",
  "unitas hospital",
  "morningside mediclinic",
  "sandton mediclinic",
  "garden city clinic",
  "milpark hospital",
  "eden day hospital",
  "vincent pallotti",
  "national hospital",
  "provincial hospital",
  "government hospital",
  "academic hospital",
  "chris hani baragwanath",
  "groote schuur",
  "tygerberg",
  "charlotte maxeke",
  "steve biko",
  "grey's hospital",
  "king edward",
  "inkosi albert luthuli",
];

/**
 * Returns true if the place name or type suggests it almost certainly has a
 * website even when the OSM tag is missing. This prevents false "high priority"
 * labels for large institutions.
 */
function inferHasWebsite(name: string, type: string): boolean {
  const lower = name.toLowerCase();
  // Large hospitals almost always have a web presence
  if (type === "hospital") return true;
  // Known SA chains
  if (SA_KNOWN_CHAINS.some((chain) => lower.includes(chain))) return true;
  // Any name that includes "hospital" or "medi" group keywords
  if (/\bhospital\b/.test(lower)) return true;
  if (/\bmedical cent(re|er)\b/.test(lower)) return true;
  if (/\bday clinic\b/.test(lower)) return true;
  if (/\bday hospital\b/.test(lower)) return true;
  return false;
}

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
  // focusSmall=true excludes hospitals — better for finding independent GP prospects
  const focusSmall = searchParams.get("focusSmall") !== "false";

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const hospitalClause = focusSmall
    ? "" // omit hospitals when looking for small independent practices
    : `
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  way["amenity"="hospital"](around:${radius},${lat},${lon});`;

  const query = `
[out:json][timeout:25];
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
      if (!res.ok) { lastError = `${endpoint} returned ${res.status}`; continue; }
      overpassData = await res.json();
      break;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!overpassData) {
    return NextResponse.json({ error: `OpenStreetMap unavailable. ${lastError}` }, { status: 502 });
  }

  const elements: OverpassElement[] = overpassData.elements ?? [];

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
      const osmWebsite = el.tags.website ?? el.tags["contact:website"] ?? el.tags["url"] ?? null;
      const type = el.tags.healthcare ?? el.tags.amenity ?? el.tags.office ?? "medical";
      const inSystem = practiceNames.has(name.toLowerCase());
      const prospectStatus = prospectMap.get(String(el.id)) ?? null;

      // Use OSM data first, then infer from name/type for well-known chains
      const hasWebsite = osmWebsite !== null || inferHasWebsite(name, type);
      const websiteSource: "osm" | "inferred" | "none" = osmWebsite
        ? "osm"
        : inferHasWebsite(name, type)
        ? "inferred"
        : "none";

      const priority: "high" | "medium" | "low" = inSystem
        ? "low"
        : !hasWebsite
        ? "high"
        : "medium";

      return {
        osmId: String(el.id),
        name,
        address:
          [el.tags["addr:housenumber"], el.tags["addr:street"], el.tags["addr:suburb"] ?? el.tags["addr:city"]]
            .filter(Boolean)
            .join(" ") || null,
        phone: el.tags.phone ?? el.tags["contact:phone"] ?? el.tags["contact:mobile"] ?? null,
        website: osmWebsite,
        websiteSource,
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

  return NextResponse.json({ results, total: results.length, rawCount: elements.length });
}
