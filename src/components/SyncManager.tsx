"use client";
import { useEffect } from "react";
import { isMember, useSession } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { resolveConflict, stopSync, syncNow, useSync } from "@/lib/sync";
import { Button } from "./ui";

/** Keeps local data and the signed-in user's cloud copy in step. Renders the conflict prompt when needed. */
export function SyncManager() {
  const session = useSession();
  const userId = isMember(session) ? session.user.id : null;
  const conflict = useSync((s) => s.conflict);

  useEffect(() => {
    if (!userId || !supabase) { stopSync(); return; }
    const run = () => void syncNow(userId);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const startWhenHydrated = () => run();
    if (useStore.persist.hasHydrated()) run();
    const unsubHydrate = useStore.persist.onFinishHydration(startWhenHydrated);

    // Push local edits shortly after they happen.
    const unsubDirty = useStore.subscribe((s, prev) => {
      if (s.dirty && (!prev.dirty || s.places !== prev.places || s.history !== prev.history || s.home !== prev.home)) {
        clearTimeout(timer);
        timer = setTimeout(run, 1500);
      }
    });

    // Pull when another device saves.
    const channel = supabase
      .channel(`user_data:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_data", filter: `user_id=eq.${userId}` }, (payload) => {
        const v = (payload.new as { updated_at?: string } | null)?.updated_at;
        if (v && v !== useStore.getState().syncedVersion) run();
      })
      .subscribe();

    const onVisible = () => document.visibilityState === "visible" && run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      unsubHydrate();
      unsubDirty();
      supabase?.removeChannel(channel);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  if (!conflict) return null;

  const local = useStore.getState();
  const count = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="conflict-title" className="fixed inset-0 z-[2000] grid place-items-end bg-black/40 p-4 sm:place-items-center">
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
        <h2 id="conflict-title" className="text-lg font-bold">Which copy should we keep?</h2>
        <p className="mt-1 text-sm text-muted">This device and your account were both changed. Pick one; the other will be replaced.</p>
        <div className="mt-4 grid gap-2">
          <Button onClick={() => resolveConflict("cloud")}>
            Keep cloud copy · {count(conflict.remote.places.length, "place")}, {count(conflict.remote.history.length, "meal")}
          </Button>
          <Button variant="outline" onClick={() => resolveConflict("device")}>
            Keep this device · {count(local.places.length, "place")}, {count(local.history.length, "meal")}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">Not sure? Export a backup from Settings first.</p>
      </div>
    </div>
  );
}
