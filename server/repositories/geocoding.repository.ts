import { getSupabaseClient } from "../config/supabase.js";
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
    .select("latitude, longitude, formatted_name, country_code, found")
    .eq("destination_key", destinationKey)
    .maybeSingle();

  if (error) {
    console.error(`[geocoding] Error leyendo la caché de "${destinationKey}"`, error);
    return undefined;
  }
  if (!data) {
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
    },
    { onConflict: "destination_key" },
  );

  if (error) {
    console.error(`[geocoding] Error guardando en caché "${destinationKey}"`, error);
  }
}
