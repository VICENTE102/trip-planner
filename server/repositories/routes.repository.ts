import { getSupabaseClient } from "../config/supabase.js";
import { CACHE_TTL_DAYS, isExpired } from "../config/cache-policy.js";

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

// Cuántas claves caben en una consulta.
//
// PostgREST mete el filtro `in.(...)` en la URL, no en el cuerpo. Una
// búsqueda normal pide 306 tramos y cada clave ocupa unos 60 bytes ya
// escapada: 17,5 KB de URL, por encima del límite de 16 KB que undici (el
// cliente HTTP de Node) impone a la cabecera. La petición ni salía.
//
// Con 100 claves la URL ronda los 6 KB, con margen de sobra aunque las
// coordenadas crezcan.
const MAX_KEYS_PER_QUERY = 100;

// Best-effort como el resto de repositorios: sin Supabase configurado, o si
// la consulta falla, se devuelve un mapa vacío y quien llama sigue adelante
// calculando. La caché ahorra llamadas, no es un requisito.
export async function readCachedLegs(routeKeys: string[]): Promise<Map<string, CachedLeg>> {
  const found = new Map<string, CachedLeg>();
  const db = getSupabaseClient();
  if (!db || routeKeys.length === 0) {
    return found;
  }

  const lotes: string[][] = [];
  for (let i = 0; i < routeKeys.length; i += MAX_KEYS_PER_QUERY) {
    lotes.push(routeKeys.slice(i, i + MAX_KEYS_PER_QUERY));
  }

  // En paralelo: son lecturas independientes y encadenarlas multiplicaría la
  // latencia por el número de lotes dentro de la petición del usuario.
  const respuestas = await Promise.all(
    lotes.map((lote) =>
      db.from("routes_cache").select("route_key, duration_seconds, distance_km, created_at").in("route_key", lote),
    ),
  );

  const data = [];
  for (const respuesta of respuestas) {
    if (respuesta.error) {
      // Un lote que falle no invalida los demás: cada tramo que se rescate es
      // una consulta menos al proveedor.
      console.error("[routes] Error leyendo un lote de la caché de rutas", respuesta.error);
      continue;
    }
    data.push(...(respuesta.data ?? []));
  }

  for (const row of data) {
    // Las calles cambian poco, pero cambian: obras, una plaza que se
    // peatonaliza. Un tramo viejo se deja fuera y se vuelve a pedir, que es
    // lo que la caché sabe hacer sola.
    if (isExpired(row.created_at, CACHE_TTL_DAYS.routes)) {
      continue;
    }
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
      // Igual que en geocoding_cache: el upsert no toca lo que no se le pasa,
      // así que sin esto un tramo caducado se recalcularía en cada búsqueda
      // sin renovar nunca su fecha.
      created_at: new Date().toISOString(),
    })),
    { onConflict: "route_key" },
  );

  if (error) {
    console.error("[routes] Error guardando en la caché de rutas", error);
  }
}
