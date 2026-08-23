// Cuánto vale un dato cacheado antes de volver a preguntarlo.
//
// No hay un número para todo: las coordenadas de Roma no cambian nunca y un
// restaurante cierra. Los cuatro casos tienen razones distintas y por eso son
// cuatro constantes y no una.

export const CACHE_TTL_DAYS = {
  /**
   * Coordenadas de una ciudad que el proveedor SÍ encontró.
   *
   * El centro de Roma es el mismo que hace un año. El año no está para
   * corregir la ciudad, sino para que un dato guardado por una versión
   * antigua del código no se quede indefinidamente fuera de alcance.
   */
  geocodingFound: 365,

  /**
   * Destinos que el proveedor dijo NO conocer.
   *
   * Este es el que de verdad importa. Un "no encontrado" se cachea a
   * propósito —si no, cada falta de ortografía costaría una llamada— pero
   * guardarlo para siempre significa que un mal día de Geoapify deja ese
   * destino roto de forma permanente: nunca se volvería a preguntar. Treinta
   * días es corto para que una caída se cure sola y largo para que un
   * "asdfgh" no cueste una llamada por búsqueda.
   */
  geocodingNotFound: 30,

  /**
   * Tramos a pie entre dos coordenadas.
   *
   * El callejero cambia poco: obras, una calle que se peatonaliza. Medio año
   * es tiempo de sobra para recoger esos cambios sin renunciar al ahorro,
   * que aquí es el grande — una búsqueda puede resolver cincuenta pares.
   */
  routes: 180,

  /**
   * Sitios de Overture.
   *
   * OJO: esto NO expulsa nada. `places` no es una caché que se rellene sola
   * como las otras dos: Overture no es una API en vivo, se carga a mano con
   * `npm run pois:load` desde una máquina con DuckDB, y Vercel solo lee.
   *
   * Hacer caducar una fila aquí no provocaría que se repusiera: provocaría
   * que el destino se quedara SIN sitios reales y el itinerario volviera a
   * inventárselos con el mock, en silencio y justo el día 91. Se perdería lo
   * mejor que tiene la aplicación para arreglar un problema que casi nunca
   * existe.
   *
   * Así que aquí "caducado" significa "avísame de que conviene recargarlo", y
   * quien avisa es el cargador (`pois:load`), no el motor.
   */
  placesStale: 90,
} as const;

/**
 * Si un dato guardado en `at` ya pasó su tiempo.
 *
 * Sin fecha se considera caducado: una fila sin `created_at` viene de antes de
 * que esto existiera y es más seguro volver a pedirla que confiar en ella.
 */
export function isExpired(at: string | null | undefined, ttlDays: number, now: number = Date.now()): boolean {
  if (!at) {
    return true;
  }

  const stored = Date.parse(at);
  if (Number.isNaN(stored)) {
    return true;
  }

  // Una fecha en el futuro (reloj desajustado, fila escrita a mano) no es
  // motivo para tirar el dato: se trata como recién guardado.
  return now - stored > ttlDays * 24 * 60 * 60 * 1000;
}

/** Días transcurridos desde `at`, para los mensajes del cargador. */
export function daysSince(at: string | null | undefined, now: number = Date.now()): number | undefined {
  if (!at) return undefined;
  const stored = Date.parse(at);
  if (Number.isNaN(stored)) return undefined;
  return Math.max(0, Math.floor((now - stored) / (24 * 60 * 60 * 1000)));
}
