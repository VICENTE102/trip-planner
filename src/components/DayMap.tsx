import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DayStop, TierLevel } from "../types";

interface DayMapProps {
  stops: DayStop[];
  tier: TierLevel;
}

// Mismo hue por tier que TIER_THEME.solidBg (constants/tierTheme.ts), pero
// en hexadecimal: Leaflet pinta iconos/líneas con color CSS directo, no
// acepta clases de Tailwind.
const TIER_HEX: Record<TierLevel, string> = {
  barato: "#10b981",
  medio: "#6366f1",
  caro: "#f59e0b",
};

function numberedIcon(index: number, color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="background:${color}" class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md">${index + 1}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function FitBoundsToStops({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    map.fitBounds(positions, { padding: [32, 32] });
  }, [map, positions]);

  return null;
}

export function DayMap({ stops, tier }: DayMapProps) {
  const color = TIER_HEX[tier];
  const positions: [number, number][] = stops.map((stop) => [stop.lat, stop.lng]);

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-ink-200 lg:h-full">
      <MapContainer center={positions[0]} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} pathOptions={{ color, weight: 3, dashArray: "6 8" }} />
        {stops.map((stop, index) => (
          <Marker key={stop.id + index} position={[stop.lat, stop.lng]} icon={numberedIcon(index, color)}>
            <Popup>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{stop.label}</p>
              <p className="text-sm text-ink-700">{stop.text}</p>
            </Popup>
          </Marker>
        ))}
        <FitBoundsToStops positions={positions} />
      </MapContainer>
    </div>
  );
}
