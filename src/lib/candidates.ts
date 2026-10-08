import { distanceKm } from "./geo";
import type { Dish, Filters, LatLng, Pick, Place } from "./types";

export type Candidate = Dish & { place: Place; km: number | null };

export function filterDishes(places: Place[], history: Pick[], home: LatLng | null, f: Filters): Candidate[] {
  const recent = new Set(history.slice(0, 3).map((h) => h.dishId));
  return places.flatMap((p) => {
    const km = distanceKm(p, home);
    if (f.maxKm && (km == null || km > f.maxKm)) return [];
    return p.dishes
      .filter((d) =>
        (f.appetite === "any" || d.appetite === f.appetite) &&
        (f.category === "any" || d.category === f.category) &&
        (!f.budget || d.price <= f.budget) &&
        (!f.vegOnly || d.veg) &&
        (!f.skipRecent || !recent.has(d.id)))
      .map((d) => ({ ...d, place: p, km }));
  });
}

export function shuffled<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Final wheel rotation that lands slice `idx` of `n` under the top pointer, after several full turns. */
export function rotationFor(idx: number, n: number, from: number, jitter = 0) {
  const a = 360 / n;
  const target = idx * a + a / 2 + jitter * a * 0.3;
  const delta = (((360 - target - (from % 360)) % 360) + 360) % 360;
  return from + 360 * 6 + delta;
}
