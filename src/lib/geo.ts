import type { LatLng, Place } from "./types";

/** Straight-line distance in km. Road distance is usually 20–40% more. */
export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanceKm(p: Place, home: LatLng | null): number | null {
  if (home && p.location) return Math.round(haversineKm(home, p.location) * 10) / 10;
  return p.manualKm ?? null;
}

export function formatKm(km: number | null) {
  if (km == null) return "–";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
}

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This browser can't share location."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === 1 ? "Location permission was denied." : "Couldn't get your location.")),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  });
}

export function directionsUrl(p: Place) {
  const dest = p.location ? `${p.location.lat},${p.location.lng}` : encodeURIComponent(`${p.name} ${p.address ?? ""}`.trim());
  const pid = p.googlePlaceId ? `&destination_place_id=${p.googlePlaceId}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${pid}`;
}

// Swiggy and Zomato have no public API. A saved share link opens the exact restaurant;
// without one we fall back to a search, which may only land on the home screen.
export const swiggyUrl = (p: Place) => p.swiggyUrl || `https://www.swiggy.com/search?query=${encodeURIComponent(p.name)}`;
export const zomatoUrl = (p: Place) => p.zomatoUrl || `https://www.zomato.com/search?q=${encodeURIComponent(p.name)}`;

export const PUNE: LatLng = { lat: 18.5204, lng: 73.8567 };
