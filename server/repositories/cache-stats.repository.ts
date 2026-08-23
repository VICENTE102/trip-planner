import { getSupabaseClient } from "../config/supabase.js";

export interface CacheStatRow {
  cache: string;
  hits: number;
  misses: number;
}

/**
 * Suma los aciertos y fallos de una búsqueda al total del día.
 *
 * Una sola llamada con las tres cachés juntas, no una por caché: cada ida y
 * vuelta a Supabase se paga en latencia dentro de la petición del usuario.
 *
 * La suma la hace Postgres (`increment_cache_stats`, ver supabase/schema.sql)
 * por la misma razón que el contador de gasto: leer, sumar y escribir desde
 * aquí haría que dos búsquedas simultáneas se pisaran, y el porcentaje del
 * que depende la estrategia de coste dejaría de ser cierto justo cuando más
 * tráfico hay.
 *
 * Sin Supabase configurado no hace nada. Los errores se dejan salir para que
 * los recoja quien llama (cache-stats.service.ts), que ya escribió la línea
 * de log: la medición es lo primero que se sacrifica si algo falla.
 */
export async function incrementCacheStats(rows: CacheStatRow[]): Promise<void> {
  const db = getSupabaseClient();
  if (!db || rows.length === 0) {
    return;
  }

  const { error } = await db.rpc("increment_cache_stats", { p_stats: rows });

  if (error) {
    throw new Error(`increment_cache_stats: ${error.message}`);
  }
}
