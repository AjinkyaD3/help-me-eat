"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Heart, MapPin, Navigation, Pencil, Trash2 } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import { APPETITE } from "@/lib/types";
import { PUNE, directionsUrl, distanceKm, formatKm, swiggyUrl, zomatoUrl } from "@/lib/geo";
import { PlacesMap } from "@/components/Map";
import { LocationPicker } from "@/components/LocationPicker";
import { DishForm } from "@/components/DishForm";
import { Button, Card, Field, LinkButton, SectionLabel, Skeleton, cx } from "@/components/ui";

export default function PlaceDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const { places, home, updatePlace, deletePlace, saveDish, deleteDish, toggleFav } = useStore();
  const [editingDish, setEditingDish] = useState<string | null>(null);
  const [movingPin, setMovingPin] = useState(false);
  const p = places.find((x) => x.id === id);

  if (!hydrated) return <Skeleton />;
  if (!p) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-semibold">This place doesn&apos;t exist anymore.</p>
        <Link href="/places" className="mt-3 inline-block font-semibold text-leaf">Back to places</Link>
      </div>
    );
  }

  const km = distanceKm(p, home);
  const remove = () => {
    if (!confirm(`Delete ${p.name} and its menu?`)) return;
    deletePlace(p.id);
    router.replace("/places");
  };

  return (
    <>
      <Link href="/places" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Places</Link>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">{p.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {[p.address, km != null && `${formatKm(km)} from home${p.location && home ? " (straight line)" : ""}`, p.rating ? `★ ${p.rating}` : null].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <LinkButton href={directionsUrl(p)}><Navigation size={15} /> Directions</LinkButton>
        <LinkButton href={swiggyUrl(p)} color="#FC8019">Swiggy</LinkButton>
        <LinkButton href={zomatoUrl(p)} color="#E23744">Zomato</LinkButton>
      </div>

      <SectionLabel>Location</SectionLabel>
      {movingPin || !p.location ? (
        <Card>
          <LocationPicker
            home={home}
            initial={p.location}
            searchable={!p.location}
            onChange={(pick) => {
              updatePlace(p.id, { location: pick.location, ...(pick.address && { address: pick.address }), ...(pick.googlePlaceId && { googlePlaceId: pick.googlePlaceId }) });
            }}
          />
          {p.location && <Button variant="outline" className="mt-3 w-full" onClick={() => setMovingPin(false)}>Done</Button>}
        </Card>
      ) : (
        <>
          <PlacesMap center={p.location ?? PUNE} home={home} pins={[{ id: p.id, position: p.location, title: p.name }]} className="h-48" />
          <Button variant="ghost" className="mt-1 px-2 py-1.5 text-sm" onClick={() => setMovingPin(true)}><MapPin size={15} /> Move pin</Button>
        </>
      )}

      <SectionLabel>Menu</SectionLabel>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {p.dishes.length === 0 && <li className="px-4 py-6 text-center text-muted">No dishes yet. Add the first one below.</li>}
        {p.dishes.map((d) =>
          editingDish === d.id ? (
            <li key={d.id} className="p-4">
              <DishForm initial={d} onSave={(x) => { saveDish(p.id, x); setEditingDish(null); }} onCancel={() => setEditingDish(null)} />
            </li>
          ) : (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span aria-label={d.veg ? "Veg" : "Non-veg"} className={cx("grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border-2", d.veg ? "border-leaf" : "border-chilli")}>
                <span className={cx("h-1.5 w-1.5 rounded-full", d.veg ? "bg-leaf" : "bg-chilli")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.name}</p>
                <p className="text-xs text-muted">{d.category} · {APPETITE[d.appetite].label} appetite</p>
              </div>
              <span className="font-semibold tabular-nums">₹{d.price}</span>
              <div className="flex">
                <button aria-label={d.fav ? "Remove favourite" : "Favourite"} aria-pressed={d.fav} onClick={() => toggleFav(p.id, d.id)} className="rounded-lg p-2 hover:bg-bg">
                  <Heart size={17} className={d.fav ? "fill-chilli text-chilli" : "text-muted"} />
                </button>
                <button aria-label={`Edit ${d.name}`} onClick={() => setEditingDish(d.id)} className="rounded-lg p-2 text-muted hover:bg-bg"><Pencil size={16} /></button>
                <button aria-label={`Delete ${d.name}`} onClick={() => deleteDish(p.id, d.id)} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-chilli"><Trash2 size={16} /></button>
              </div>
            </li>
          ),
        )}
      </ul>

      <SectionLabel>Add a dish</SectionLabel>
      <Card><DishForm onSave={(x) => saveDish(p.id, x)} /></Card>

      <SectionLabel>Details</SectionLabel>
      <Card className="space-y-4">
        <Field label="Name" value={p.name} onChange={(e) => updatePlace(p.id, { name: e.target.value })} />
        <Field
          label="Rating"
          inputMode="decimal"
          value={p.rating ? String(p.rating) : ""}
          placeholder="0 to 5"
          onChange={(e) => { const v = Number(e.target.value); updatePlace(p.id, { rating: Number.isFinite(v) ? Math.min(5, Math.max(0, v)) : 0 }); }}
        />
        {!p.location && (
          <Field label="Distance from home (km)" inputMode="decimal" value={p.manualKm ?? ""} onChange={(e) => updatePlace(p.id, { manualKm: e.target.value ? Number(e.target.value) : undefined })} />
        )}
        <Field
          label="Swiggy link"
          hint="In the Swiggy app, open this restaurant, tap Share, and paste the link here."
          type="url" inputMode="url" placeholder="https://www.swiggy.com/…"
          value={p.swiggyUrl ?? ""}
          onChange={(e) => updatePlace(p.id, { swiggyUrl: e.target.value.trim() || undefined })}
        />
        <Field
          label="Zomato link"
          type="url" inputMode="url" placeholder="https://zoma.to/…"
          value={p.zomatoUrl ?? ""}
          onChange={(e) => updatePlace(p.id, { zomatoUrl: e.target.value.trim() || undefined })}
        />
      </Card>

      <Button variant="danger" className="mx-auto mt-6 flex" onClick={remove}><Trash2 size={16} /> Delete place</Button>
    </>
  );
}
