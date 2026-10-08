"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { MapPin, Navigation, Shuffle, SlidersHorizontal, Star, Users } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import { APPETITE, CATEGORIES, type Appetite } from "@/lib/types";
import { filterDishes, rotationFor, shuffled, type Candidate } from "@/lib/candidates";
import { directionsUrl, formatKm, swiggyUrl, zomatoUrl } from "@/lib/geo";
import { Button, Card, Chip, LinkButton, PageHeader, SectionLabel, Segmented, Skeleton } from "@/components/ui";
import { Wheel } from "@/components/Wheel";

const BUDGETS = [0, 100, 200, 300, 500];
const DISTANCES = [0, 1, 3, 5, 10];

/** Picks a slice and the final rotation that lands it under the pointer, with a little jitter. */
function planSpin(n: number, rotation: number) {
  const idx = Math.floor(Math.random() * n);
  return { idx, to: rotationFor(idx, n, rotation, Math.random() * 2 - 1) };
}

export default function SpinView() {
  const hydrated = useHydrated();
  const { places, history, home, filters: f, setFilters, lockIn } = useStore();
  const [showFilters, setShowFilters] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pending, setPending] = useState<Candidate | null>(null);
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinningRef = useRef(false);

  const candidates = useMemo(() => filterDishes(places, history, home, f), [places, history, home, f]);

  // Up to 8 dishes on the wheel; favourites always get a slot.
  const slices = useMemo(() => {
    if (!hydrated) return []; // shuffle only in the browser
    const favs = candidates.filter((c) => c.fav);
    return shuffled([...favs, ...shuffled(candidates.filter((c) => !c.fav))].slice(0, 8));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, shuffleKey, hydrated]);

  const spin = () => {
    if (!slices.length || spinningRef.current) return;
    const { idx, to } = planSpin(slices.length, rotation);
    const chosen = slices[idx];
    setWinner(null);
    setPending(chosen);
    spinningRef.current = true;
    setSpinning(true);
    setRotation(to);
    navigator.vibrate?.(15);
    // Fallback in case the browser never fires transitionend (e.g. tab backgrounded mid-spin).
    if (finishTimer.current) clearTimeout(finishTimer.current);
    finishTimer.current = setTimeout(() => finish(chosen), 4200);
  };

  const finish = (chosen: Candidate | null) => {
    if (finishTimer.current) { clearTimeout(finishTimer.current); finishTimer.current = null; }
    if (!spinningRef.current) return;
    spinningRef.current = false;
    setSpinning(false);
    setWinner(chosen);
    navigator.vibrate?.([30, 40, 30]);
  };

  const onSpinEnd = () => finish(pending);

  const confirm = () => {
    if (!winner) return;
    lockIn({ dishId: winner.id, dish: winner.name, placeId: winner.place.id, place: winner.place.name, price: winner.price });
    setWinner(null);
    setShuffleKey((k) => k + 1);
  };

  if (!hydrated) return <Skeleton />;

  const active = [f.budget && `Under ₹${f.budget}`, f.maxKm && `Within ${f.maxKm} km`, f.vegOnly && "Veg"].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title="What are we eating?" />

      <SectionLabel>How hungry</SectionLabel>
      <Segmented<Appetite | "any">
        label="Appetite"
        value={f.appetite}
        onChange={(appetite) => setFilters({ appetite })}
        options={[{ value: "any", label: "Any" }, ...(["low", "med", "high"] as Appetite[]).map((k) => ({ value: k, label: APPETITE[k].label }))]}
      />

      <SectionLabel>Craving</SectionLabel>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {["any", ...CATEGORIES].map((c) => (
          <Chip key={c} on={f.category === c} onClick={() => setFilters({ category: c })}>{c === "any" ? "Anything" : c}</Chip>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowFilters((s) => !s)}
        aria-expanded={showFilters}
        className="mt-5 flex w-full items-center justify-between rounded-xl py-1 text-sm"
      >
        <span className="flex items-center gap-2 font-semibold text-leaf"><SlidersHorizontal size={16} /> Budget, distance, diet</span>
        <span className="text-muted">{active.length ? active.join(" · ") : "No limits"}</span>
      </button>

      {showFilters && (
        <Card className="mt-3 space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted">Max price per dish</p>
            <div className="flex flex-wrap gap-2">{BUDGETS.map((b) => <Chip key={b} on={f.budget === b} onClick={() => setFilters({ budget: b })}>{b ? `₹${b}` : "Any"}</Chip>)}</div>
          </div>
          <div>
            <p className="mb-2 text-sm text-muted">Distance from home</p>
            <div className="flex flex-wrap gap-2">{DISTANCES.map((d) => <Chip key={d} on={f.maxKm === d} onClick={() => setFilters({ maxKm: d })}>{d ? `${d} km` : "Any"}</Chip>)}</div>
            {!home && f.maxKm > 0 && <p className="mt-2 text-xs text-muted">Places with a map pin need a home location. <Link className="font-semibold text-leaf" href="/settings">Set home</Link></p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip on={f.vegOnly} onClick={() => setFilters({ vegOnly: !f.vegOnly })}>Veg only</Chip>
            <Chip on={f.skipRecent} onClick={() => setFilters({ skipRecent: !f.skipRecent })}>Skip last 3 picks</Chip>
          </div>
        </Card>
      )}

      <div className="mt-6">
        {slices.length ? (
          <Wheel labels={slices.map((s) => (s.fav ? "♥ " : "") + s.name)} rotation={rotation} onSpinEnd={onSpinEnd} />
        ) : (
          <div className="mx-auto grid aspect-square w-full max-w-[300px] place-items-center rounded-full bg-card p-10 text-center text-[15px] text-muted">
            {places.length ? "Nothing matches. Loosen a filter or add more dishes." : <span>No places yet. <Link href="/places/new" className="font-semibold text-leaf">Add your first</Link></span>}
          </div>
        )}
        <p className="mt-3 text-center text-sm text-muted" aria-live="polite">
          {candidates.length} {candidates.length === 1 ? "dish matches" : "dishes match"}{candidates.length > 8 ? ", 8 on the wheel" : ""}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={spin} disabled={!slices.length || spinning} className="flex-1 py-3.5 text-base">{spinning ? "Spinning…" : "Spin"}</Button>
        {candidates.length > 8 && (
          <Button variant="outline" aria-label="Reshuffle wheel" onClick={() => setShuffleKey((k) => k + 1)} disabled={spinning}><Shuffle size={18} /></Button>
        )}
      </div>

      <Link href="/group" className="mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-leaf hover:bg-leaf-soft">
        <Users size={16} /> Spin with friends
      </Link>

      {winner && (
        <Card className="mt-5 border-l-4 border-saffron" >
          <div aria-live="assertive">
            <p className="text-sm text-muted">Tonight it&apos;s</p>
            <p className="text-2xl font-bold tracking-tight">{winner.name}</p>
            <Link href={`/places/${winner.place.id}`} className="mt-1 flex items-center gap-1.5 text-[15px] hover:underline">
              <MapPin size={15} className="text-muted" /> {winner.place.name}
              {winner.km != null && <span className="text-muted">· {formatKm(winner.km)}</span>}
              {!!winner.place.rating && <span className="flex items-center gap-0.5 text-muted">· <Star size={13} /> {winner.place.rating}</span>}
            </Link>
            <p className="mt-1 text-sm text-muted">₹{winner.price} · {APPETITE[winner.appetite].label} appetite · {winner.veg ? "Veg" : "Non-veg"}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <LinkButton href={directionsUrl(winner.place)}><Navigation size={15} /> Go</LinkButton>
            <LinkButton href={swiggyUrl(winner.place)} color="#FC8019">Swiggy</LinkButton>
            <LinkButton href={zomatoUrl(winner.place)} color="#E23744">Zomato</LinkButton>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button onClick={confirm}>Lock it in</Button>
            <Button variant="outline" onClick={spin}>Spin again</Button>
          </div>
        </Card>
      )}
    </>
  );
}
