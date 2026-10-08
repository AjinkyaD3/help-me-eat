import { NextResponse } from "next/server";

export type SearchResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  googlePlaceId?: string;
};

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

type GooglePlace = { id: string; displayName?: { text: string }; formattedAddress?: string; location: { latitude: number; longitude: number }; rating?: number };
type NominatimHit = { place_id: number; name?: string; display_name: string; lat: string; lon: string };

// Google Places (New) when a key is configured, otherwise OpenStreetMap Nominatim (free, no key).
// The key stays on the server and is never sent to the browser.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const near = Number.isFinite(lat) && Number.isFinite(lng) && searchParams.has("lat") ? { lat, lng } : null;

  if (q.length < 2) return NextResponse.json({ results: [], provider: null });

  try {
    const results = GOOGLE_KEY ? await google(q, near) : await nominatim(q, near);
    return NextResponse.json({ results, provider: GOOGLE_KEY ? "google" : "osm" });
  } catch (e) {
    console.error("place search failed", e);
    return NextResponse.json({ error: "Search is unavailable right now. Try again in a moment." }, { status: 502 });
  }
}

async function google(q: string, near: { lat: number; lng: number } | null): Promise<SearchResult[]> {
  const body: Record<string, unknown> = { textQuery: q, maxResultCount: 8 };
  if (near) body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 15000 } };
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const json = await res.json();
  return ((json.places ?? []) as GooglePlace[]).map((p) => ({
    id: p.id,
    googlePlaceId: p.id,
    name: p.displayName?.text ?? "Unnamed place",
    address: p.formattedAddress ?? "",
    lat: p.location.latitude,
    lng: p.location.longitude,
    rating: p.rating ?? 0,
  }));
}

async function nominatim(q: string, near: { lat: number; lng: number } | null): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q, format: "jsonv2", limit: "8", addressdetails: "0", countrycodes: "in" });
  if (near) {
    const d = 0.25; // roughly 25 km box to prefer nearby results
    params.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": `FoodSpin/1.0 (${process.env.CONTACT_EMAIL ?? "foodspin app"})` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const json = (await res.json()) as NominatimHit[];
  return json.map((r) => ({
    id: String(r.place_id),
    name: r.name || String(r.display_name).split(",")[0],
    address: String(r.display_name).split(",").slice(1, 4).join(",").trim(),
    lat: Number(r.lat),
    lng: Number(r.lon),
    rating: 0,
  }));
}
