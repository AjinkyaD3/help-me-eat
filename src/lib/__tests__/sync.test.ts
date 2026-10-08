import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Backup } from "../store";

// In-memory stand-in for the user_data table. Each write gets a new server-side version stamp.
const db = vi.hoisted(() => ({ row: null as null | { data: unknown; updated_at: string }, n: 0, fail: false }));

vi.mock("../supabase", () => {
  const from = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => (db.fail ? { data: null, error: { message: "network down" } } : { data: db.row, error: null }),
      }),
    }),
    upsert: (v: { data: unknown }) => ({
      select: () => ({
        single: async () => {
          db.row = { data: v.data, updated_at: `v${++db.n}` };
          return { data: { updated_at: db.row.updated_at }, error: null };
        },
      }),
    }),
  });
  return { supabase: { from }, cloudEnabled: true };
});

const { useStore } = await import("../store");
const { syncNow, resolveConflict, useSync } = await import("../sync");

const U = "user-1";
const cloud = (places: string[]): Backup => ({
  version: 1, home: null, history: [],
  places: places.map((name) => ({ id: name, name, rating: 0, dishes: [], createdAt: 0 })),
});
const names = () => useStore.getState().places.map((p) => p.name);
const addPlace = (name: string) => useStore.getState().addPlace({ name, rating: 0 });

beforeEach(async () => {
  db.row = null; db.n = 0; db.fail = false;
  await useStore.persist.rehydrate();
  useStore.setState({ places: [], history: [], home: null, syncedVersion: null, syncedUserId: null });
  useStore.setState({ dirty: false }); // the reset above counts as an edit; a real fresh device starts clean
  useSync.setState({ status: "idle", conflict: null, error: null });
});

describe("cloud sync", () => {
  it("uploads local data when the account has nothing yet", async () => {
    addPlace("Vaishali");
    await syncNow(U);
    expect((db.row!.data as Backup).places.map((p) => p.name)).toEqual(["Vaishali"]);
    expect(useStore.getState().dirty).toBe(false);
  });

  it("marks local edits as dirty", () => {
    addPlace("Vaishali");
    expect(useStore.getState().dirty).toBe(true);
  });

  it("a fresh, untouched device takes the cloud copy", async () => {
    db.row = { data: cloud(["Cloud Cafe"]), updated_at: "v9" };
    await syncNow(U);
    expect(names()).toEqual(["Cloud Cafe"]);
    expect(useStore.getState().dirty).toBe(false);
    expect(useStore.getState().syncedVersion).toBe("v9");
  });

  it("pulls when another device changed the cloud and this one is clean", async () => {
    addPlace("A");
    await syncNow(U);
    db.row = { data: cloud(["A", "B from laptop"]), updated_at: "v99" };
    await syncNow(U);
    expect(names()).toEqual(["A", "B from laptop"]);
  });

  it("pushes local edits when the cloud hasn't changed", async () => {
    addPlace("A");
    await syncNow(U);
    addPlace("B");
    await syncNow(U);
    expect((db.row!.data as Backup).places.map((p) => p.name)).toEqual(["A", "B"]);
  });

  it("asks instead of overwriting when both sides changed", async () => {
    addPlace("A");
    await syncNow(U);
    db.row = { data: cloud(["A", "laptop edit"]), updated_at: "v50" };
    addPlace("phone edit");
    await syncNow(U);
    expect(useSync.getState().status).toBe("conflict");
    expect(names()).toEqual(["A", "phone edit"]); // nothing replaced yet
    expect((db.row!.data as Backup).places.map((p) => p.name)).toEqual(["A", "laptop edit"]);
  });

  it("keep cloud replaces device data", async () => {
    addPlace("A"); await syncNow(U);
    db.row = { data: cloud(["laptop"]), updated_at: "v50" };
    addPlace("phone"); await syncNow(U);
    resolveConflict("cloud");
    await vi.waitFor(() => expect(useSync.getState().status).toBe("idle"));
    expect(names()).toEqual(["laptop"]);
  });

  it("keep device overwrites the cloud", async () => {
    addPlace("A"); await syncNow(U);
    db.row = { data: cloud(["laptop"]), updated_at: "v50" };
    addPlace("phone"); await syncNow(U);
    resolveConflict("device");
    await vi.waitFor(() => expect((db.row!.data as Backup).places.map((p) => p.name)).toEqual(["A", "phone"]));
  });

  it("local edits before first sign-in are not silently thrown away", async () => {
    addPlace("added while logged out");
    db.row = { data: cloud(["existing account data"]), updated_at: "v3" };
    await syncNow(U);
    expect(useSync.getState().status).toBe("conflict");
    expect(names()).toEqual(["added while logged out"]);
  });

  it("signing into a different account asks first", async () => {
    addPlace("A"); await syncNow(U);
    db.row = { data: cloud(["other person's data"]), updated_at: "v7" };
    await syncNow("user-2");
    expect(useSync.getState().status).toBe("conflict");
  });

  it("reports errors and keeps local data", async () => {
    addPlace("A");
    db.fail = true;
    await syncNow(U);
    expect(useSync.getState().status).toBe("error");
    expect(names()).toEqual(["A"]);
    expect(useStore.getState().dirty).toBe(true);
  });
});
