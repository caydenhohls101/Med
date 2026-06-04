/**
 * Shared Overpass API helper.
 * Fires all mirrors in parallel and takes whichever responds first.
 * This cuts worst-case latency from 3×timeout to 1×timeout.
 */

const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",   // fastest in testing
  "https://lz4.overpass-api.de/api/interpreter",     // CDN-backed mirror
  "https://overpass-api.de/api/interpreter",         // primary (sometimes slow)
];

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

async function tryEndpoint(url: string, body: string, ms: number): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "MediBook-SA/1.0 (medibook.co.za)",
        "Accept": "application/json",
      },
      body: `data=${encodeURIComponent(body)}`,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function queryOverpass(
  query: string,
  timeoutMs = 28000
): Promise<{ elements: OverpassElement[] }> {
  // Fire all endpoints in parallel — take whichever wins
  const races = ENDPOINTS.map((endpoint) =>
    tryEndpoint(endpoint, query, timeoutMs)
      .then((elements) => {
        console.log(`[Overpass] ✓ ${endpoint} (${elements.length} elements)`);
        return elements;
      })
      .catch((err) => {
        console.warn(`[Overpass] ✗ ${endpoint}:`, err instanceof Error ? err.message : err);
        return Promise.reject(err);
      })
  );

  try {
    // Promise.any: resolves with first success, rejects only if ALL fail
    const elements = await Promise.any(races);
    return { elements };
  } catch {
    throw new Error("All Overpass endpoints failed — map data temporarily unavailable.");
  }
}
