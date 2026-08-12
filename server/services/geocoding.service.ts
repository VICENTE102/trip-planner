import type { Coordinates, GeocodedCity, GeocodingProvider } from "../types/geocoding.js";
import { getGeoapifyApiKey } from "../config/env.js";
import { createGeoapifyGeocodingProvider } from "../providers/geoapify-geocoding.provider.js";
import { mockGeocodingProvider } from "../providers/mock-geocoding.provider.js";
import { readCachedGeocoding, writeCachedGeocoding } from "../repositories/geocoding.repository.js";
import { normalizeCityName } from "../utils/text.js";

// Caché de proceso: mientras la función serverless siga caliente, el mismo
// destino no vuelve ni a Supabase. Solo guarda respuestas de un proveedor
// real, nunca del mock (ver más abajo). null = "el proveedor confirmó que no
// existe", que también hay que recordar.
const memoryCache = new Map<string, GeocodedCity | null>();

let realProvider: GeocodingProvider | undefined | null = null;

// null = todavía no se ha mirado; undefined = ya se miró y no hay clave.
function getRealProvider(): GeocodingProvider | undefined {
  if (realProvider === null) {
    const apiKey = getGeoapifyApiKey();
    realProvider = apiKey ? createGeoapifyGeocodingProvider(apiKey) : undefined;
    if (!realProvider) {
      console.warn("[geocoding] GEOAPIFY_API_KEY no configurada; se usarán coordenadas simuladas.");
    }
  }
  return realProvider;
}

async function mockCenter(destination: string): Promise<Coordinates> {
  const city = await mockGeocodingProvider.geocodeCity(destination);
  return city.coordinates;
}

// Devuelve el centro real de la ciudad, con esta cadena de resolución:
//
//   memoria -> caché de Supabase -> Geoapify -> mock
//
// Nunca lanza ni devuelve undefined: una búsqueda de viaje no puede fallar
// porque un geocodificador esté caído. En el peor caso se degrada al centro
// simulado de siempre, que es exactamente el comportamiento anterior al
// Paso 2.
export async function resolveCityCenter(destination: string): Promise<Coordinates> {
  const key = normalizeCityName(destination);
  if (key === "") {
    return mockCenter(destination);
  }

  const remembered = memoryCache.get(key);
  if (remembered !== undefined) {
    return remembered ? remembered.coordinates : mockCenter(destination);
  }

  const cached = await readCachedGeocoding(key);
  if (cached) {
    const city = cached.found ? cached.city : null;
    memoryCache.set(key, city);
    return city ? city.coordinates : mockCenter(destination);
  }

  const provider = getRealProvider();
  if (!provider) {
    // Sin clave no se cachea nada: si se guardase el centro simulado,
    // configurar GEOAPIFY_API_KEY más tarde no arreglaría este destino,
    // porque la caché ya tendría una respuesta "válida" para él.
    return mockCenter(destination);
  }

  try {
    const city = await provider.geocodeCity(destination);
    memoryCache.set(key, city ?? null);
    await writeCachedGeocoding({
      destinationKey: key,
      destinationInput: destination,
      provider: provider.name,
      city,
    });

    if (!city) {
      console.warn(`[geocoding] ${provider.name} no encontró "${destination}"; se usa el centro simulado.`);
      return mockCenter(destination);
    }
    return city.coordinates;
  } catch (error) {
    // Fallo de red, cuota o respuesta ilegible: no se cachea ni en memoria
    // ni en Supabase, para que la siguiente búsqueda lo reintente.
    console.error(`[geocoding] Error geocodificando "${destination}" con ${provider.name}`, error);
    return mockCenter(destination);
  }
}
