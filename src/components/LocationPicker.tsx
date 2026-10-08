"use client";
import { useState } from "react";
import { Crosshair, Search } from "lucide-react";
import type { LatLng } from "@/lib/types";
import { PUNE, getCurrentPosition } from "@/lib/geo";
import type { SearchResult } from "@/app/api/places/search/route";
import { PlacesMap } from "./Map";
import { Button, Field } from "./ui";

export type Picked = { location: LatLng; name?: string; address?: string; rating?: number; googlePlaceId?: string };

export function LocationPicker({ home, initial, onChange, searchable = true }: {
  home: LatLng | null; initial?: LatLng | null; onChange: (p: Picked) => void; searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "empty">("idle");
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<LatLng | null>(initial ?? null);

  const pick = (p: Picked) => { setPicked(p.location); onChange(p); };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setStatus("loading");
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (home) { params.set("lat", String(home.lat)); params.set("lng", String(home.lng)); }
      const res = await fetch(`/api/places/search?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResults(json.results);
      setStatus(json.results.length ? "idle" : "empty");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Search failed.");
      setStatus("error");
    }
  };

  const useMine = async () => {
    try { pick({ location: await getCurrentPosition() }); }
    catch (err) { setError((err as Error).message); setStatus("error"); }
  };

  return (
    <div className="space-y-3">
      {searchable && (
        <form onSubmit={search} className="flex gap-2" role="search">
          <div className="flex-1"><Field aria-label="Search places" placeholder="Search a restaurant, e.g. Vaishali FC Road" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Button type="submit" aria-label="Search" disabled={status === "loading"}><Search size={18} /></Button>
        </form>
      )}
      {status === "loading" && <p className="text-sm text-muted">Searching…</p>}
      {status === "empty" && <p className="text-sm text-muted">No matches. Try adding the area name, or tap the map to drop a pin.</p>}
      {status === "error" && <p className="text-sm text-chilli">{error}</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { pick({ location: { lat: r.lat, lng: r.lng }, name: r.name, address: r.address, rating: r.rating, googlePlaceId: r.googlePlaceId }); setResults([]); }}
                className="w-full px-4 py-3 text-left hover:bg-bg"
              >
                <span className="block font-semibold">{r.name}{r.rating ? <span className="font-normal text-muted"> · ★ {r.rating}</span> : null}</span>
                <span className="block truncate text-sm text-muted">{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <PlacesMap center={picked ?? home ?? PUNE} home={home} picked={picked} onPick={(location) => pick({ location })} className="h-72" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{picked ? "Pin set. Tap the map to move it." : "Tap the map to drop a pin."}</p>
        <Button type="button" variant="ghost" onClick={useMine} className="px-2 py-1.5 text-sm"><Crosshair size={16} /> I&apos;m here</Button>
      </div>
    </div>
  );
}
