import { incrementCacheStats } from "../repositories/cache-stats.repository.js";

export type CacheName = "geocoding" | "places" | "routes";

const CACHES: CacheName[] = ["geocoding", "places", "routes"];

export interface CacheTally {
  hits: Record<CacheName, number>;
  misses: Record<CacheName, number>;
}

// Se pasa como parámetro en vez de acumularse en una variable de módulo.
//
// Parece más aparatoso y es lo correcto: una función de Vercel puede atender
// dos peticiones a la vez en la misma instancia, y como toda la cadena está
// llena de `await`, las dos se intercalan. Un contador compartido mezclaría
// las cifras de dos viajes distintos y daría un porcentaje que no describe a
// ninguno de los dos.
export function createCacheTally(): CacheTally {
  const zeros = () => ({ geocoding: 0, places: 0, routes: 0 });
  return { hits: zeros(), misses: zeros() };
}

export function recordCacheHit(tally: CacheTally | undefined, cache: CacheName, count = 1): void {
  if (tally) tally.hits[cache] += count;
}

export function recordCacheMiss(tally: CacheTally | undefined, cache: CacheName, count = 1): void {
  if (tally) tally.misses[cache] += count;
}

function percent(hits: number, misses: number): string {
  const total = hits + misses;
  return total === 0 ? "—" : `${Math.round((hits / total) * 100)}%`;
}

/**
 * La línea que se escribe por búsqueda. Una sola, con el reparto de las tres
 * cachés, para poder leer de un vistazo cuánto costó de verdad este viaje.
 *
 * Ejemplo: `[cache] roma geocoding=1/1 (100%) places=1/1 (100%) routes=42/48 (88%)`
 */
export function formatCacheTally(tally: CacheTally, destinationKey: string): string {
  const partes = CACHES.filter((cache) => tally.hits[cache] + tally.misses[cache] > 0).map((cache) => {
    const hits = tally.hits[cache];
    const total = hits + tally.misses[cache];
    return `${cache}=${hits}/${total} (${percent(hits, tally.misses[cache])})`;
  });

  return `[cache] ${destinationKey} ${partes.join(" ") || "sin consultas"}`;
}

/**
 * Deja constancia de lo que costó esta búsqueda: una línea en el log y una
 * suma en la tabla diaria.
 *
 * Nunca lanza. Es la misma regla que el contador de gasto del Paso 8: medir
 * si la caché funciona no puede ser motivo para que alguien se quede sin
 * viaje. Si la tabla de estadísticas falla, el log ya se ha escrito.
 */
export async function reportCacheTally(tally: CacheTally, destinationKey: string): Promise<void> {
  console.log(formatCacheTally(tally, destinationKey));

  const filas = CACHES.map((cache) => ({
    cache,
    hits: tally.hits[cache],
    misses: tally.misses[cache],
  })).filter((fila) => fila.hits + fila.misses > 0);

  if (filas.length === 0) {
    return;
  }

  try {
    await incrementCacheStats(filas);
  } catch (error) {
    console.error("[cache] No se pudieron guardar las estadísticas de caché", error);
  }
}
