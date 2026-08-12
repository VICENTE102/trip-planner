import type { TravelMatrixEntry } from "../types/route.js";
import { haversineDistanceKm } from "../utils/geo.js";

export interface ClusterablePlace {
  id: string;
  latitude: number;
  longitude: number;
}

const WALK_SPEED_KMH = 4.5;
const TRANSIT_SPEED_KMH = 20;
// Por debajo de esta distancia se asume que se va andando en vez de en
// transporte (implementación de MockRoutesProvider, Fase 12: estimación
// por distancia en línea recta, no un dato verificado de Google Routes).
const WALK_THRESHOLD_KM = 1.5;
const MIN_TRAVEL_MINUTES = 5;

// calculateTravelMatrix(): estima tiempos de desplazamiento por distancia
// en línea recta entre cada par de lugares (hotel + actividades). Es el
// cálculo detrás de MockRoutesProvider (server/providers/mock-routes.provider.ts);
// una implementación real de RoutesProvider lo sustituiría por Google Routes.
export function calculateTravelMatrix(places: ClusterablePlace[]): TravelMatrixEntry[] {
  const entries: TravelMatrixEntry[] = [];

  for (const from of places) {
    for (const to of places) {
      if (from.id === to.id) continue;
      const distanceKm = haversineDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
      const transportMode: TravelMatrixEntry["transportMode"] = distanceKm <= WALK_THRESHOLD_KM ? "walk" : "transit";
      const speedKmh = transportMode === "walk" ? WALK_SPEED_KMH : TRANSIT_SPEED_KMH;
      const travelMinutes = Math.max(MIN_TRAVEL_MINUTES, Math.round((distanceKm / speedKmh) * 60));

      entries.push({ fromId: from.id, toId: to.id, distanceKm, travelMinutes, transportMode });
    }
  }

  return entries;
}

export function buildTravelMatrixLookup(entries: TravelMatrixEntry[]): Map<string, TravelMatrixEntry> {
  const lookup = new Map<string, TravelMatrixEntry>();
  for (const entry of entries) {
    lookup.set(`${entry.fromId}->${entry.toId}`, entry);
  }
  return lookup;
}

// clusterPlacesByProximity(): a esta escala (unas pocas decenas de lugares
// como mucho) un k-means completo es más complejo de lo que aporta.
// Ordenar por latitud/longitud y trocear en partes iguales agrupa lugares
// cercanos entre sí en la práctica (los contiguos en ese orden espacial
// tienden a estar cerca) con un algoritmo simple y determinista.
export function clusterPlacesByProximity<T extends ClusterablePlace>(places: T[], clusterCount: number): T[][] {
  const count = Math.max(1, clusterCount);
  const clusters: T[][] = Array.from({ length: count }, () => []);

  if (places.length === 0) {
    return clusters;
  }

  const sorted = [...places].sort((a, b) => a.latitude - b.latitude || a.longitude - b.longitude);
  const baseSize = Math.floor(sorted.length / count);
  const remainder = sorted.length % count;

  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    clusters[i] = sorted.slice(cursor, cursor + size);
    cursor += size;
  }

  return clusters;
}
