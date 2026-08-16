import { getSupabaseClient } from "../config/supabase.js";

export interface CachedLeg {
  routeKey: string;
  durationSeconds: number;
  distanceKm: number;
}

export interface LegToCache extends CachedLeg {
  profile: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  provider: string;
}

// Las coordenadas llegan de Overture con 7 decimales. Redondear a 5 (~1 m)
// hace que dos referencias al mismo sitio compartan fila; sin esto la caché
// no acertaría casi nunca y cada búsqueda volvería a llamar a ORS.
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

// El sentido forma parte de la clave: ida y vuelta no tienen por qué durar
// lo mismo (calles de un solo sentido, cuestas).
export function routeKey(
  profile: string,
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): string {
  const f = `${roundCoordinate(from.latitude)},${roundCoordinate(from.longitude)}`;
  const t = `${roundCoordinate(to.latitude)},${roundCoordinate(to.longitude)}`;
  return `${profile}|${f}|${t}`;
}

// Best-effort como el resto de repositorios: sin Supabase configurado, o si
// la consulta falla, se devuelve un mapa vacío y quien llama sigue adelante
// calculando. La caché ahorra llamadas, no es un requisito.
export async function readCachedLegs(routeKeys: string[]): Promise<Map<string, CachedLeg>> {
  const found = new Map<string, CachedLeg>();
  const db = getSupabaseClient();
  if (!db || routeKeys.length === 0) {
    return found;
  }

  const { data, error } = await db
    .from("routes_cache")
    .select("route_key, duration_seconds, distance_km")
    .in("route_key", routeKeys);

  if (error) {
    console.error("[routes] Error leyendo la caché de rutas", error);
    return found;
  }

  for (const row of data ?? []) {
    found.set(row.route_key, {
      routeKey: row.route_key,
      durationSeconds: row.duration_seconds,
      distanceKm: row.distance_km,
    });
  }
  return found;
}

export async function writeCachedLegs(legs: LegToCache[]): Promise<void> {
  const db = getSupabaseClient();
  if (!db || legs.length === 0) {
    return;
  }

  // upsert: dos búsquedas simultáneas pueden resolver el mismo par a la vez,
  // y eso no es un error.
  const { error } = await db.from("routes_cache").upsert(
    legs.map((leg) => ({
      route_key: leg.routeKey,
      profile: leg.profile,
      from_lat: leg.fromLat,
      from_lng: leg.fromLng,
      to_lat: leg.toLat,
      to_lng: leg.toLng,
      duration_seconds: leg.durationSeconds,
      distance_km: leg.distanceKm,
      provider: leg.provider,
    })),
    { onConflict: "route_key" },
  );

  if (error) {
    console.error("[routes] Error guardando en la caché de rutas", error);
  }
}
