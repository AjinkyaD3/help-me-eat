"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Navigation, X } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import { PUNE, directionsUrl, distanceKm, formatKm, swiggyUrl, zomatoUrl } from "@/lib/geo";
import { PlacesMap } from "@/components/Map";
import { Card, Chip, LinkButton, PageHeader, Skeleton } from "@/components/ui";

const RADII = [0, 1, 3, 5, 10];

export default function MapPageView() {
  const hydrated = useHydrated();
  const { places, home } = useStore();
  const [radius, setRadius] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const mapped = useMemo(() => places.filter((p) => p.location), [places]);
  const inRange = radius ? mapped.filter((p) => (distanceKm(p, home) ?? Infinity) <= radius) : mapped;
  const sel = places.find((p) => p.id === selected);

  if (!hydrated) return <Skeleton />;

  return (
    <>
      <PageHeader
        title="Map"
        subtitle={`${mapped.length} of ${places.length} places pinned${places.length > mapped.length ? ". Pin the rest from each place's page" : ""}`}
      />

      {home && (
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Show places within">
          {RADII.map((r) => <Chip key={r} on={radius === r} onClick={() => setRadius(r)}>{r ? `${r} km` : "All"}</Chip>)}
        </div>
      )}

      <PlacesMap
        center={home ?? mapped[0]?.location ?? PUNE}
        home={home}
        radiusKm={radius}
        pins={inRange.map((p) => ({ id: p.id, position: p.location!, title: p.name, highlight: p.id === selected }))}
        onSelect={setSelected}
        className="h-[58vh]"
      />

      {!home && (
        <p className="mt-3 text-sm text-muted">
          <Link href="/settings" className="font-semibold text-leaf">Set your home</Link> to see distances and filter by range.
        </p>
      )}

      {sel && (
        <Card className="relative mt-4">
          <button aria-label="Close" onClick={() => setSelected(null)} className="absolute right-3 top-3 rounded-full p-1 text-muted hover:bg-bg"><X size={18} /></button>
          <Link href={`/places/${sel.id}`} className="text-lg font-bold hover:underline">{sel.name}</Link>
          <p className="text-sm text-muted">
            {formatKm(distanceKm(sel, home))} · {sel.dishes.length} dishes{sel.rating ? ` · ★ ${sel.rating}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <LinkButton href={directionsUrl(sel)}><Navigation size={15} /> Go</LinkButton>
            <LinkButton href={swiggyUrl(sel)} color="#FC8019">Swiggy</LinkButton>
            <LinkButton href={zomatoUrl(sel)} color="#E23744">Zomato</LinkButton>
          </div>
        </Card>
      )}
    </>
  );
}
