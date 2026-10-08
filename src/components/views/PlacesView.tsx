"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import { distanceKm, formatKm } from "@/lib/geo";
import type { Place } from "@/lib/types";
import { Field, PageHeader, Segmented, Skeleton } from "@/components/ui";

type Sort = "near" | "cheap" | "rated";
const avg = (p: Place) => (p.dishes.length ? p.dishes.reduce((s, d) => s + d.price, 0) / p.dishes.length : Infinity);

export default function PlacesView() {
  const hydrated = useHydrated();
  const { places, home } = useStore();
  const [sort, setSort] = useState<Sort>("near");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = places
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.dishes.some((d) => d.name.toLowerCase().includes(term)))
      .map((p) => ({ p, km: distanceKm(p, home) }));
    if (sort === "near") rows.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
    if (sort === "cheap") rows.sort((a, b) => avg(a.p) - avg(b.p));
    if (sort === "rated") rows.sort((a, b) => b.p.rating - a.p.rating);
    return rows;
  }, [places, home, sort, q]);

  if (!hydrated) return <Skeleton />;

  return (
    <>
      <PageHeader
        title="Places"
        subtitle={`${places.length} places · ${places.reduce((s, p) => s + p.dishes.length, 0)} dishes`}
        action={<Link href="/places/new" className="inline-flex items-center gap-1.5 rounded-xl bg-leaf px-3.5 py-2.5 text-sm font-semibold text-on-leaf hover:bg-leaf-dark"><Plus size={16} /> Add</Link>}
      />
      <div className="relative mb-3">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <Field aria-label="Search places and dishes" placeholder="Search places or dishes" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>
      <Segmented<Sort> label="Sort by" value={sort} onChange={setSort} options={[{ value: "near", label: "Nearest" }, { value: "cheap", label: "Cheapest" }, { value: "rated", label: "Top rated" }]} />

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {list.map(({ p, km }) => (
          <li key={p.id}>
            <Link href={`/places/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.rating ? `★ ${p.rating} · ` : ""}{p.dishes.length} dishes{p.dishes.length ? ` · avg ₹${Math.round(avg(p))}` : ""}
                </p>
              </div>
              <span className="text-sm font-medium tabular-nums">{formatKm(km)}</span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
        {!list.length && <li className="px-4 py-8 text-center text-muted">{places.length ? "No matches." : "No places yet."}</li>}
      </ul>
      {!home && places.some((p) => p.location) && (
        <p className="mt-3 text-sm text-muted"><Link href="/settings" className="font-semibold text-leaf">Set your home</Link> to sort pinned places by distance.</p>
      )}
    </>
  );
}
