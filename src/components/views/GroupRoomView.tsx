"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Crown, Navigation, Share2, X } from "lucide-react";
import { ensureSession } from "@/lib/auth";
import { rotationFor } from "@/lib/candidates";
import {
  MAX_VETOES, allowedDishes, joinRoom, loadRoom, mapsSearchUrl, normaliseCode, reopenRoom, setVetoes, spinRoom, subscribeRoom,
  type Member, type Room,
} from "@/lib/group";
import { useStore } from "@/lib/store";
import { Wheel } from "@/components/Wheel";
import { Button, Card, Field, LinkButton, PageHeader, SectionLabel, Skeleton, cx } from "@/components/ui";

export default function GroupRoomView() {
  const params = useParams<{ code: string }>();
  const code = normaliseCode(params.code ?? "");
  const { displayName, setDisplayName, lockIn } = useStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [rotation, setRotation] = useState(0);
  const [instant, setInstant] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [locked, setLocked] = useState<number | null>(null);

  const lastSpun = useRef<number | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<(initial: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const refresh = async (initial: boolean) => {
      const { room, members } = await loadRoom(code);
      if (cancelled) return;
      setRoom(room);
      setMembers(members);
      const res = room?.result ?? null;
      if (!res) { lastSpun.current = null; setRevealed(null); return; }
      if (res.spunAt === lastSpun.current) return;
      lastSpun.current = res.spunAt;
      const idx = Math.max(0, res.wheel.indexOf(res.dishId));
      if (initial) {
        setInstant(true);
        setRotation(rotationFor(idx, res.wheel.length, 0));
        setRevealed(res.spunAt);
      } else {
        setInstant(false);
        setRevealed(null);
        setRotation((r) => rotationFor(idx, res.wheel.length, r));
        if (revealTimer.current) clearTimeout(revealTimer.current);
        revealTimer.current = setTimeout(() => setRevealed(res.spunAt), 4200); // in case transitionend never fires
        navigator.vibrate?.(15);
      }
    };
    refreshRef.current = refresh;

    (async () => {
      try {
        const session = await ensureSession();
        if (cancelled) return;
        setUserId(session.user.id);
        const first = await loadRoom(code);
        const name = useStore.getState().displayName.trim();
        if (first.room && name && !first.members.some((m) => m.user_id === session.user.id)) await joinRoom(code, name);
        await refresh(true);
        if (!cancelled) unsubscribe = subscribeRoom(code, () => void refresh(false));
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); setRoom(null); }
      }
    })();

    const onVisible = () => document.visibilityState === "visible" && void refresh(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisible);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, [code]);

  if (room === undefined) return <Skeleton />;

  const back = <Link href="/group" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> Group spin</Link>;

  if (!room) {
    return (
      <>
        {back}
        <Card className="py-8 text-center">
          <p className="text-lg font-semibold">{error || `No group spin with code ${code}`}</p>
          <p className="mt-1 text-sm text-muted">Codes expire after 24 hours. Check the code or start a new one.</p>
        </Card>
      </>
    );
  }

  const me = members.find((m) => m.user_id === userId);
  const isHost = room.host_id === userId;
  const host = members.find((m) => m.user_id === room.host_id);
  const myVetoes = me?.vetoes ?? [];
  const res = room.result;
  const spinning = !!res && revealed !== res.spunAt;
  const dishById = new Map(room.dishes.map((d) => [d.id, d]));
  const wheelDishes = res ? res.wheel.map((id) => dishById.get(id)).filter((d) => !!d) : allowedDishes(room, members);
  const winner = res && revealed === res.spunAt ? dishById.get(res.dishId) : undefined;

  // Joining: ask for a name first.
  if (!me) {
    return (
      <>
        {back}
        <PageHeader title="Join group spin" subtitle={`${host?.name ?? "A friend"} invited you. Code ${code}`} />
        <Card>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const n = (nameInput || displayName).trim();
              if (!n) return;
              setBusy(true);
              try { setDisplayName(n); await joinRoom(code, n); await refreshRef.current(true); }
              catch (err) { setError((err as Error).message); }
              setBusy(false);
            }}
          >
            <Field label="Your name" autoFocus maxLength={30} value={nameInput || displayName} onChange={(e) => setNameInput(e.target.value)} placeholder="e.g. Sam" />
            <Button type="submit" className="w-full" disabled={busy || !(nameInput || displayName).trim()}>{busy ? "Joining…" : "Join"}</Button>
            {error && <p role="alert" className="text-sm text-chilli">{error}</p>}
          </form>
        </Card>
      </>
    );
  }

  const toggleVeto = async (dishId: string) => {
    if (!userId || room.status !== "voting") return;
    const next = myVetoes.includes(dishId) ? myVetoes.filter((v) => v !== dishId) : myVetoes.length < MAX_VETOES ? [...myVetoes, dishId] : null;
    if (!next) return;
    setMembers((ms) => ms.map((m) => (m.user_id === userId ? { ...m, vetoes: next } : m))); // optimistic
    try { await setVetoes(code, userId, next); } catch (e) { setError((e as Error).message); void refreshRef.current(false); }
  };

  const share = async () => {
    const url = `${location.origin}/group/${code}`;
    const text = `Help pick what we eat! Join my FoodSpin with code ${code}`;
    try {
      if (navigator.share) await navigator.share({ title: "FoodSpin group spin", text, url });
      else { await navigator.clipboard.writeText(`${text}: ${url}`); setShareMsg("Link copied"); setTimeout(() => setShareMsg(""), 2000); }
    } catch { /* share sheet dismissed */ }
  };

  const doSpin = async () => {
    setBusy(true); setError("");
    try { await spinRoom(room, members); await refreshRef.current(false); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const vetoNames = (dishId: string) => members.filter((m) => m.vetoes.includes(dishId)).map((m) => (m.user_id === userId ? "you" : m.name));

  return (
    <>
      {back}
      <PageHeader
        title="Group spin"
        subtitle={`Code ${code}`}
        action={<Button variant="outline" onClick={share} aria-label="Invite friends"><Share2 size={16} /> {shareMsg || "Invite"}</Button>}
      />

      <div className="flex flex-wrap gap-2" aria-label="People in this spin">
        {members.map((m) => (
          <span key={m.user_id} className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm">
            {m.user_id === room.host_id && <Crown size={13} className="text-saffron" aria-label="Host" />}
            {m.user_id === userId ? `${m.name} (you)` : m.name}
            <span className="text-xs text-muted">{m.vetoes.length}/{MAX_VETOES}</span>
          </span>
        ))}
      </div>

      <div className="mt-6">
        <Wheel labels={wheelDishes.map((d) => d.name)} rotation={rotation} instant={instant} onSpinEnd={() => res && setRevealed(res.spunAt)} />
        <p className="mt-3 text-center text-sm text-muted" aria-live="polite">
          {spinning ? "Spinning…" : res ? "" : `${wheelDishes.length} of ${room.dishes.length} dishes still in`}
        </p>
      </div>

      {winner && (
        <Card className="mt-4 border-l-4 border-saffron">
          <div aria-live="assertive">
            <p className="text-sm text-muted">The group is eating</p>
            <p className="text-2xl font-bold tracking-tight">{winner.name}</p>
            <p className="text-[15px]">{winner.place} · ₹{winner.price}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <LinkButton href={mapsSearchUrl(winner)}><Navigation size={15} /> Directions</LinkButton>
            <Button
              variant="outline"
              disabled={locked === res?.spunAt}
              onClick={() => { lockIn({ dishId: winner.id, dish: winner.name, placeId: winner.placeId, place: winner.place, price: winner.price }); setLocked(res!.spunAt); }}
              className="py-2.5 text-sm"
            >
              {locked === res?.spunAt ? <><Check size={15} /> Saved</> : "Add to my history"}
            </Button>
          </div>
          {isHost && <Button variant="ghost" className="mt-2 w-full" onClick={() => reopenRoom(code).then(() => refreshRef.current(false))}>Reopen vetoes and spin again</Button>}
        </Card>
      )}

      {!res && (
        isHost ? (
          <Button className="mt-4 w-full py-3.5 text-base" disabled={busy} onClick={doSpin}>{busy ? "Spinning…" : "Spin for everyone"}</Button>
        ) : (
          <p className="mt-4 rounded-xl bg-card py-3 text-center text-sm text-muted">Waiting for {host?.name ?? "the host"} to spin</p>
        )
      )}
      {error && <p role="alert" className="mt-3 text-sm text-chilli">{error}</p>}

      {room.status === "voting" && (
        <>
          <SectionLabel>Veto up to {MAX_VETOES} dishes · {MAX_VETOES - myVetoes.length} left</SectionLabel>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
            {room.dishes.map((d) => {
              const mine = myVetoes.includes(d.id);
              const by = vetoNames(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    aria-pressed={mine}
                    onClick={() => toggleVeto(d.id)}
                    disabled={!mine && myVetoes.length >= MAX_VETOES}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg disabled:opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cx("truncate font-medium", by.length > 0 && "text-muted line-through")}>{d.name}</p>
                      <p className="truncate text-xs text-muted">{d.place} · ₹{d.price}{by.length ? ` · vetoed by ${by.join(", ")}` : ""}</p>
                    </div>
                    <span className={cx("grid h-8 w-8 place-items-center rounded-full border", mine ? "border-chilli bg-chilli text-white" : "border-line text-muted")}>
                      <X size={16} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
