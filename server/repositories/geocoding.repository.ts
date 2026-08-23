import { getSupabaseClient } from "../config/supabase.js";
import { CACHE_TTL_DAYS, isExpired } from "../config/cache-policy.js";
import type { GeocodedCity } from "../types/geocoding.js";

// Una entrada de la caché: o la ciudad se encontró (found: true, con
// coordenadas), o el proveedor confirmó que no la conoce (found: false).
// Los fallos de red no llegan a guardarse nunca — ver geocoding.service.ts.
export type CachedGeocoding = { found: true; city: GeocodedCity } | { found: false };

// Best-effort, igual que la persistencia de viajes (Fase 11): sin Supabase
// configurado, o si la consulta falla, se devuelve undefined y el que llama
// sigue adelante geocodificando. La caché es una optimización de coste, no
// un requisito para que funcione la app.
export async function readCachedGeocoding(destinationKey: string): Promise<CachedGeocoding | undefined> {
  const db = getSupabaseClient();
  if (!db) {
    return undefined;
  }

  const { data, error } = await db
    .from("geocoding_cache")
    .select("latitude, longitude, formatted_name, country_code, found, created_at")
    .eq("destination_key", destinationKey)
    .maybeSingle();

  if (error) {
    console.error(`[geocoding] Error leyendo la caché de "${destinationKey}"`, error);
    return undefined;
  }
  if (!data) {
    return undefined;
  }

  // El plazo depende de lo que se guardó, no de la tabla.
  //
  // Un "no encontrado" caduca en un mes y unas coordenadas buenas duran un
  // año, y la diferencia no es cosmética: sin ella, un mal día de Geoapify
  // con un destino lo dejaba roto PARA SIEMPRE. La fila decía "esa ciudad no
  // existe" y nadie volvía a preguntar nunca.
  const ttl = data.found ? CACHE_TTL_DAYS.geocodingFound : CACHE_TTL_DAYS.geocodingNotFound;
  if (isExpired(data.created_at, ttl)) {
    return undefined;
  }

  if (!data.found) {
    return { found: false };
  }
  // Una fila marcada como encontrada pero sin coordenadas está corrupta:
  // se ignora para que se vuelva a geocodificar y se sobrescriba.
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    return undefined;
  }

  return {
    found: true,
    city: {
      coordinates: { lat: data.latitude, lng: data.longitude },
      formattedName: data.formatted_name ?? undefined,
      countryCode: data.country_code ?? undefined,
    },
  };
}

export async function writeCachedGeocoding(params: {
  destinationKey: string;
  destinationInput: string;
  provider: string;
  city?: GeocodedCity;
}): Promise<void> {
  const db = getSupabaseClient();
  if (!db) {
    return;
  }

  const { destinationKey, destinationInput, provider, city } = params;

  // upsert y no insert: dos búsquedas simultáneas del mismo destino nuevo
  // pueden intentar escribir la misma clave a la vez, y eso no es un error.
  const { error } = await db.from("geocoding_cache").upsert(
    {
      destination_key: destinationKey,
      destination_input: destinationInput,
      latitude: city?.coordinates.lat ?? null,
      longitude: city?.coordinates.lng ?? null,
      formatted_name: city?.formattedName ?? null,
      country_code: city?.countryCode ?? null,
      found: city !== undefined,
      provider,
      // Se refresca al reescribir. Sin esto, `created_at` conserva la fecha
      // del primer insert (el upsert no toca las columnas que no le pasas) y
      // una fila caducada se quedaría caducada PARA SIEMPRE: volvería a
      // preguntarse en cada búsqueda sin dejar nunca de estar vencida. La
      // caducidad pasaría de arreglar un destino roto a hacerlo caro.
      created_at: new Date().toISOString(),
    },
    { onConflict: "destination_key" },
  );

  if (error) {
    console.error(`[geocoding] Error guardando en caché "${destinationKey}"`, error);
  }
}
