"use client";
import { create } from "zustand";
import { supabase } from "./supabase";
import { isBackup, snapshot, useStore, type Backup } from "./store";

/*
  Sync model: one JSON document per user in `user_data`.
  - The device keeps `dirty` (changed since last sync) and `syncedVersion` (the cloud row's
    updated_at at last sync). No clock comparisons between phone and server.
  - Cloud changed, device clean   -> pull
  - Device dirty, cloud unchanged -> push
  - Both changed                  -> ask the user which copy to keep
*/

export type SyncStatus = "off" | "idle" | "syncing" | "error" | "conflict";
type Conflict = { remote: Backup; version: string; userId: string };

export const useSync = create<{ status: SyncStatus; error: string | null; lastSyncedAt: number | null; conflict: Conflict | null }>(() => ({
  status: "off", error: null, lastSyncedAt: null, conflict: null,
}));

let applyingRemote = false;

// Mark local edits as dirty. Skip the initial load from localStorage and changes we're applying from the cloud.
useStore.subscribe((s, prev) => {
  if (applyingRemote || !useStore.persist.hasHydrated()) return;
  if ((s.places !== prev.places || s.history !== prev.history || s.home !== prev.home) && !s.dirty) {
    useStore.setState({ dirty: true });
  }
});

function applyRemote(data: Backup, version: string, userId: string) {
  applyingRemote = true;
  try {
    useStore.setState({ places: data.places, history: data.history, home: data.home, dirty: false, syncedVersion: version, syncedUserId: userId });
  } finally {
    applyingRemote = false;
  }
}

async function push(userId: string) {
  const s = useStore.getState();
  const sent = { places: s.places, history: s.history, home: s.home };
  const { data, error } = await supabase!
    .from("user_data")
    .upsert({ user_id: userId, data: snapshot(sent) })
    .select("updated_at")
    .single();
  if (error) throw error;
  const now = useStore.getState();
  // If the user edited while we were uploading, stay dirty so the next sync sends those edits.
  const changedSince = now.places !== sent.places || now.history !== sent.history || now.home !== sent.home;
  useStore.setState({ dirty: changedSince, syncedVersion: data.updated_at, syncedUserId: userId });
}

let running = false;
let again = false;

export async function syncNow(userId: string): Promise<void> {
  if (!supabase) return;
  if (running) { again = true; return; }
  if (useSync.getState().status === "conflict") return; // wait for the user to choose
  running = true;
  useSync.setState({ status: "syncing", error: null });
  try {
    const { data: row, error } = await supabase.from("user_data").select("data, updated_at").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const s = useStore.getState();

    if (!row) {
      await push(userId);
    } else {
      if (!isBackup(row.data)) throw new Error("Cloud data is in an unexpected format.");
      const sameUser = s.syncedUserId === userId;
      const neverSynced = s.syncedUserId === null;
      const remoteChanged = !sameUser || row.updated_at !== s.syncedVersion;

      if (neverSynced && !s.dirty) applyRemote(row.data, row.updated_at, userId); // fresh device: take the cloud copy
      else if (!sameUser || (remoteChanged && s.dirty)) {
        useSync.setState({ status: "conflict", conflict: { remote: row.data, version: row.updated_at, userId } });
        return;
      } else if (remoteChanged) applyRemote(row.data, row.updated_at, userId);
      else if (s.dirty) await push(userId);
    }
    useSync.setState({ status: "idle", lastSyncedAt: Date.now() });
  } catch (e) {
    useSync.setState({ status: "error", error: navigator.onLine ? (e as Error).message || "Sync failed." : "You're offline. Changes will sync when you reconnect." });
  } finally {
    running = false;
    if (again) { again = false; void syncNow(userId); }
  }
}

export function resolveConflict(keep: "cloud" | "device") {
  const c = useSync.getState().conflict;
  if (!c) return;
  if (keep === "cloud") applyRemote(c.remote, c.version, c.userId);
  else useStore.setState({ dirty: true, syncedVersion: c.version, syncedUserId: c.userId });
  useSync.setState({ status: "idle", conflict: null });
  void syncNow(c.userId);
}

export function stopSync() {
  useSync.setState({ status: "off", error: null, conflict: null });
}
