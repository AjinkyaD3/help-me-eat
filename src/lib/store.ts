"use client";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Dish, Filters, LatLng, Pick, Place } from "./types";

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const dish = (name: string, price: number, appetite: Dish["appetite"], category: string, veg = true): Dish => ({
  id: uid(), name, price, appetite, category, veg, fav: false,
});

// Sample data for the first launch. Users delete these once they add their own spots.
const samplePlaces = (): Place[] => [
  { id: uid(), name: "Corner Misal House", manualKm: 0.8, rating: 4.4, createdAt: Date.now(), dishes: [
    dish("Misal Pav", 90, "med", "Breakfast"), dish("Poha", 40, "low", "Breakfast"), dish("Misal Thali", 160, "high", "Meal")] },
  { id: uid(), name: "Udupi Tiffin Centre", manualKm: 1.5, rating: 4.2, createdAt: Date.now(), dishes: [
    dish("Masala Dosa", 90, "med", "South Indian"), dish("Idli Sambar", 60, "low", "South Indian"), dish("South Indian Thali", 180, "high", "Meal")] },
  { id: uid(), name: "Dragon Wok", manualKm: 2.6, rating: 4.0, createdAt: Date.now(), dishes: [
    dish("Veg Hakka Noodles", 140, "med", "Chinese"), dish("Chicken Fried Rice", 190, "high", "Chinese", false), dish("Chicken Momos", 120, "low", "Snack", false)] },
  { id: uid(), name: "Station Road Chaat", manualKm: 1.1, rating: 4.3, createdAt: Date.now(), dishes: [
    dish("Pani Puri", 40, "low", "Street food"), dish("Pav Bhaji", 120, "high", "Street food"), dish("Kulfi", 50, "low", "Dessert")] },
];

const defaultFilters: Filters = { appetite: "any", category: "any", budget: 0, maxKm: 0, vegOnly: false, skipRecent: true };

export type Backup = { version: 1; places: Place[]; history: Pick[]; home: LatLng | null };

type State = {
  places: Place[];
  history: Pick[];
  home: LatLng | null;
  filters: Filters;
  /** Name shown to friends in group spins. */
  displayName: string;
  setDisplayName: (n: string) => void;
  /** Cloud sync bookkeeping (see lib/sync.ts). */
  dirty: boolean;
  syncedVersion: string | null;
  syncedUserId: string | null;
  setFilters: (f: Partial<Filters>) => void;
  setHome: (h: LatLng | null) => void;
  addPlace: (p: Omit<Place, "id" | "createdAt" | "dishes">) => string;
  updatePlace: (id: string, patch: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  saveDish: (placeId: string, d: Omit<Dish, "id" | "fav"> & { id?: string }) => void;
  deleteDish: (placeId: string, dishId: string) => void;
  toggleFav: (placeId: string, dishId: string) => void;
  lockIn: (p: Omit<Pick, "id" | "at">) => void;
  clearHistory: () => void;
  importBackup: (b: Backup) => void;
  resetAll: () => void;
};

const mapDishes = (places: Place[], placeId: string, fn: (d: Dish[]) => Dish[]) =>
  places.map((p) => (p.id === placeId ? { ...p, dishes: fn(p.dishes) } : p));

export const useStore = create<State>()(
  persist(
    (set) => ({
      places: samplePlaces(),
      history: [],
      home: null,
      filters: defaultFilters,
      displayName: "",
      setDisplayName: (displayName) => set({ displayName: displayName.slice(0, 30) }),
      dirty: false,
      syncedVersion: null,
      syncedUserId: null,
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      setHome: (home) => set({ home }),
      addPlace: (p) => {
        const id = uid();
        set((s) => ({ places: [...s.places, { ...p, id, createdAt: Date.now(), dishes: [] }] }));
        return id;
      },
      updatePlace: (id, patch) => set((s) => ({ places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePlace: (id) => set((s) => ({ places: s.places.filter((p) => p.id !== id) })),
      saveDish: (placeId, d) =>
        set((s) => ({
          places: mapDishes(s.places, placeId, (ds) =>
            d.id ? ds.map((x) => (x.id === d.id ? { ...x, ...d, id: x.id } : x)) : [...ds, { ...d, id: uid(), fav: false }]),
        })),
      deleteDish: (placeId, dishId) => set((s) => ({ places: mapDishes(s.places, placeId, (ds) => ds.filter((x) => x.id !== dishId)) })),
      toggleFav: (placeId, dishId) =>
        set((s) => ({ places: mapDishes(s.places, placeId, (ds) => ds.map((x) => (x.id === dishId ? { ...x, fav: !x.fav } : x))) })),
      lockIn: (p) => set((s) => ({ history: [{ ...p, id: uid(), at: Date.now() }, ...s.history].slice(0, 200) })),
      clearHistory: () => set({ history: [] }),
      importBackup: (b) => set({ places: b.places, history: b.history, home: b.home }),
      resetAll: () => set({ places: samplePlaces(), history: [], home: null, filters: defaultFilters }),
    }),
    { name: "foodspin", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export const snapshot = (s: { places: Place[]; history: Pick[]; home: LatLng | null }): Backup => ({ version: 1, places: s.places, history: s.history, home: s.home });

/** True once saved data has loaded from localStorage. Render data-driven UI only after this. */
export function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

export function isBackup(x: unknown): x is Backup {
  const b = x as Backup;
  return !!b && b.version === 1 && Array.isArray(b.places) && Array.isArray(b.history);
}
