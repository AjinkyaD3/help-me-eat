"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import { cloudEnabled } from "@/lib/supabase";
import { filterDishes } from "@/lib/candidates";
import { MAX_ROOM_DISHES, createRoom, normaliseCode, type RoomDish } from "@/lib/group";
import { Button, Card, Field, PageHeader, SectionLabel, Skeleton, cx } from "@/components/ui";

export default function GroupStartView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { places, history, home, filters, displayName, setDisplayName } = useStore();
  const candidates = useMemo(() => filterDishes(places, history, home, filters), [places, history, home, filters]);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Default selection: favourites first, then the rest, up to the room limit.
  const defaultPick = useMemo(
    () => new Set([...candidates.filter((c) => c.fav), ...candidates.filter((c) => !c.fav)].slice(0, 8).map((c) => c.id)),
    [candidates],
  );
  const selected = picked ?? defaultPick;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_ROOM_DISHES) next.add(id);
    setPicked(next);
  };

  const start = async () => {
    setBusy(true); setErr("");
    try {
      const dishes: RoomDish[] = candidates.filter((c) => selected.has(c.id)).map((c) => ({
        id: c.id, name: c.name, place: c.place.name, placeId: c.place.id, price: c.price, veg: c.veg,
        ...(c.place.location && { lat: c.place.location.lat, lng: c.place.location.lng }),
      }));
      const roomCode = await createRoom(dishes, displayName);
      router.push(`/group/${roomCode}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  if (!hydrated) return <Skeleton />;

  const back = <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Spin</Link>;

  if (!cloudEnabled) {
    return (<>{back}<PageHeader title="Spin with friends" /><Card><p className="text-sm text-muted">Group spins need Supabase, which isn&apos;t set up on this deployment yet. The README explains how.</p></Card></>);
  }

  return (
    <>
      {back}
      <PageHeader title="Spin with friends" subtitle="Everyone joins with a code, vetoes up to 2 dishes, and the host spins what's left." />

      <Card>
        <form onSubmit={(e) => { e.preventDefault(); const c = normaliseCode(code); if (c.length === 6) router.push(`/group/${c}`); }} className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Have a code?" value={code} onChange={(e) => setCode(normaliseCode(e.target.value))} placeholder="ABC123" autoCapitalize="characters" className="font-mono tracking-widest" />
          </div>
          <Button type="submit" variant="outline" disabled={normaliseCode(code).length !== 6}>Join</Button>
        </form>
      </Card>

      <SectionLabel>Or start one</SectionLabel>
      <Card className="space-y-4">
        <Field label="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="So friends know who's who" maxLength={30} />
        <div>
          <p className="text-sm font-medium">Dishes to put on the wheel</p>
          <p className="mb-2 text-xs text-muted">From your current Spin filters. {selected.size}/{MAX_ROOM_DISHES} selected, at least 2.</p>
          {candidates.length < 2 ? (
            <p className="text-sm text-muted">Fewer than 2 dishes match your filters. <Link href="/" className="font-semibold text-leaf">Loosen them on Spin</Link>.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {candidates.map((c) => {
                const on = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(c.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg">
                      <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-md border", on ? "border-leaf bg-leaf text-on-leaf" : "border-line")}>{on && <Check size={14} strokeWidth={3} />}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.name}</span><span className="block truncate text-xs text-muted">{c.place.name}</span></span>
                      <span className="text-sm tabular-nums">₹{c.price}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Button className="w-full" disabled={busy || selected.size < 2 || !displayName.trim()} onClick={start}>{busy ? "Creating…" : "Create group spin"}</Button>
        {err && <p role="alert" className="text-sm text-chilli">{err}</p>}
      </Card>
    </>
  );
}
