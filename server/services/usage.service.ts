import { incrementApiUsage, readApiUsage } from "../repositories/usage.repository.js";

// Topes diarios de llamadas a cada API externa.
//
// No son los límites del proveedor: son MUY inferiores, a propósito. Su
// función no es apurar la cuota sino que un bucle mal escrito o un bot no
// se la coman en una tarde. Los planes gratuitos rondan las 3.000 llamadas
// diarias en Geoapify y las 2.500 en OpenRouteService; con las cachés que ya
// existen, un proyecto sin tráfico real no se acerca ni de lejos a estos
// números en un día normal.
//
// Cada destino nuevo cuesta UNA llamada a Geoapify en toda la vida de la
// app, así que 500/día son 500 ciudades nuevas al día.
export const DAILY_LIMITS: Record<string, number> = {
  geoapify: 500,
  openrouteservice: 400,
};

// El contador vive en Supabase, pero consultarlo en cada búsqueda añadiría
// una ida y vuelta a cada petición. Se recuerda unos segundos: el tope es un
// guardarraíl, no una contabilidad exacta, y pasarse por unas pocas llamadas
// mientras la memoria caduca no cambia nada.
const CACHE_TTL_MS = 30_000;

interface CachedCount {
  count: number;
  readAt: number;
}

const counts = new Map<string, CachedCount>();

/** Solo para pruebas: vacía la memoria entre casos. */
export function resetUsageCache(): void {
  counts.clear();
}

// Devuelve false solo cuando se sabe con certeza que se ha superado el tope.
//
// Si el contador no está disponible (sin Supabase, o la consulta falla) se
// devuelve true. Es deliberado: un fallo del contador no puede dejar la app
// sin geocodificar ni sin rutas. El coste de equivocarse por este lado son
// unas llamadas de más; por el otro, romper el producto entero.
export async function canCallProvider(provider: string): Promise<boolean> {
  const limit = DAILY_LIMITS[provider];
  if (limit === undefined) {
    return true;
  }

  const cached = counts.get(provider);
  if (cached && Date.now() - cached.readAt < CACHE_TTL_MS) {
    return cached.count < limit;
  }

  const count = await readApiUsage(provider);
  if (count === undefined) {
    return true;
  }

  counts.set(provider, { count, readAt: Date.now() });
  if (count >= limit) {
    console.warn(`[usage] Tope diario alcanzado para "${provider}" (${count}/${limit}); se usarán datos simulados.`);
    return false;
  }
  return true;
}

// Se llama DESPUÉS de una llamada real al proveedor. Actualiza también la
// memoria para que el tope se note antes de que caduque el TTL.
export async function recordProviderCall(provider: string): Promise<void> {
  const count = await incrementApiUsage(provider);
  if (count !== undefined) {
    counts.set(provider, { count, readAt: Date.now() });
    return;
  }

  // Sin confirmación del contador remoto, se suma en memoria igualmente:
  // más vale seguir contando de forma aproximada que dejar de contar.
  const cached = counts.get(provider);
  if (cached) {
    cached.count += 1;
  }
}
