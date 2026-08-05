export interface ClusterablePlace {
  id: string;
  latitude: number;
  longitude: number;
}

export interface TravelMatrixEntry {
  fromId: string;
  toId: string;
  distanceKm: number;
  travelMinutes: number;
  transportMode: "walk" | "transit";
}

const EARTH_RADIUS_KM = 6371;
const WALK_SPEED_KMH = 4.5;
const TRANSIT_SPEED_KMH = 20;
// Por debajo de esta distancia se asume que se va andando en vez de en
// transporte (no hay proveedor real de rutas todavía, Fase 12/Google
// Routes; esto es una estimación por distancia en línea recta).
const WALK_THRESHOLD_KM = 1.5;
const MIN_TRAVEL_MINUTES = 5;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(a: ClusterablePlace, b: ClusterablePlace): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// calculateTravelMatrix(): estima tiempos de desplazamiento por distancia
// en línea recta entre cada par de lugares (hotel + actividades). No hay
// todavía Google Routes (Fase 12): es una aproximación explícita, no un
// dato verificado.
export function calculateTravelMatrix(places: ClusterablePlace[]): TravelMatrixEntry[] {
  const entries: TravelMatrixEntry[] = [];

  for (const from of places) {
    for (const to of places) {
      if (from.id === to.id) continue;
      const distanceKm = haversineDistanceKm(from, to);
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
