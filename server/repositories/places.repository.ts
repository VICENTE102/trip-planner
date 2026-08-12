import { getSupabaseClient } from "../config/supabase.js";
import type { StoredPlace } from "../types/place.js";

// Cuántos sitios se traen por destino. El motor selecciona unas pocas
// actividades por viaje (ver combine-offers.ts), así que traer la ciudad
// entera solo gastaría ancho de banda; con este tope hay variedad de sobra
// para que el ranking por afinidad tenga con qué trabajar.
const MAX_PLACES_PER_DESTINATION = 300;

// Devuelve undefined —no una lista vacía— cuando no hay datos para ese
// destino o cuando Supabase no está disponible. La diferencia importa: la
// lista vacía sería "esta ciudad no tiene nada que ver", y lo que pasa en
// realidad es "esta ciudad todavía no está cargada", que es lo que hace que
// el proveedor caiga al mock en vez de proponer un viaje sin actividades.
export async function findPlacesByDestination(destinationKey: string): Promise<StoredPlace[] | undefined> {
  const db = getSupabaseClient();
  if (!db) {
    return undefined;
  }

  const { data, error } = await db
    .from("places")
    .select(
      "id, destination_key, name, latitude, longitude, basic_category, preference, profile, duration_minutes, price_per_person, opening_hours, confidence, website",
    )
    .eq("destination_key", destinationKey)
    .order("confidence", { ascending: false })
    .limit(MAX_PLACES_PER_DESTINATION);

  if (error) {
    console.error(`[places] Error leyendo sitios de "${destinationKey}"`, error);
    return undefined;
  }
  if (!data || data.length === 0) {
    return undefined;
  }

  return data.map((row) => ({
    id: row.id,
    destinationKey: row.destination_key,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    basicCategory: row.basic_category,
    preference: row.preference,
    profile: row.profile,
    durationMinutes: row.duration_minutes,
    pricePerPerson: Number(row.price_per_person),
    openingHours: row.opening_hours ?? undefined,
    confidence: row.confidence ?? undefined,
    website: row.website ?? undefined,
  }));
}
