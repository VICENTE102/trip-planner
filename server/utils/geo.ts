import type { Coordinates } from "../types/geocoding.js";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Distancia en línea recta entre dos puntos. La usan el reparto de
// actividades por proximidad (cluster-places.ts) y el cálculo de a qué
// distancia del centro está cada alojamiento.
export function haversineDistanceKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const lat1 = toRadians(latA);
  const lat2 = toRadians(latB);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Dispersa un punto alrededor de un centro de forma determinista. Desde el
// Paso 2 ese centro es el de la ciudad real (geocoding.service.ts), así que
// los hoteles y actividades simulados caen dentro de la ciudad de verdad —
// lo que sigue siendo inventado es el sitio concreto, no la zona.
export function jitterCoordinates(center: Coordinates, random: () => number, spread: number): Coordinates {
  return {
    lat: center.lat + (random() - 0.5) * spread,
    lng: center.lng + (random() - 0.5) * spread,
  };
}
