"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "@/lib/types";

export type MapPin = { id: string; position: LatLng; title: string; subtitle?: string; highlight?: boolean };

const pinIcon = (kind: "place" | "highlight" | "home" | "picked") =>
  L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
    html: `<div class="fs-pin fs-pin-${kind}">${kind === "home" ? "⌂" : ""}</div>`,
  });

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(points)]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function MapView({
  center, home, pins = [], radiusKm, picked, onPick, onSelect, className = "h-[60vh]",
}: {
  center: LatLng;
  home?: LatLng | null;
  pins?: MapPin[];
  radiusKm?: number;
  picked?: LatLng | null;
  onPick?: (p: LatLng) => void;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const fitTo = [...pins.map((p) => p.position), ...(home ? [home] : []), ...(picked ? [picked] : [])];
  return (
    <div className={`overflow-hidden rounded-2xl border border-line ${className}`}>
      <MapContainer center={[center.lat, center.lng]} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitTo.length ? fitTo : [center]} />
        {onPick && <ClickToPick onPick={onPick} />}
        {home && (
          <>
            <Marker position={[home.lat, home.lng]} icon={pinIcon("home")}><Popup>Home</Popup></Marker>
            {!!radiusKm && (
              <Circle center={[home.lat, home.lng]} radius={radiusKm * 1000} pathOptions={{ color: "#1F7A4D", weight: 1.5, fillOpacity: 0.06 }} />
            )}
          </>
        )}
        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.position.lat, p.position.lng]}
            icon={pinIcon(p.highlight ? "highlight" : "place")}
            eventHandlers={onSelect ? { click: () => onSelect(p.id) } : undefined}
          >
            {!onSelect && <Popup><strong>{p.title}</strong>{p.subtitle && <><br />{p.subtitle}</>}</Popup>}
          </Marker>
        ))}
        {picked && <Marker position={[picked.lat, picked.lng]} icon={pinIcon("picked")} />}
      </MapContainer>
    </div>
  );
}
