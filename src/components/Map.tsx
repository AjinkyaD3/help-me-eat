"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map only renders in the browser.
export const PlacesMap = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-[60vh] animate-pulse rounded-2xl bg-line/70" aria-label="Loading map" />,
});
export type { MapPin } from "./MapView";
