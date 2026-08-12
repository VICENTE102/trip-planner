import type { GeocodedCity, GeocodingProvider } from "../types/geocoding.js";

const GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";

// Una búsqueda de viaje espera a esto antes de poder pedir hoteles y
// actividades, así que no puede quedarse colgada: si Geoapify no contesta a
// tiempo se aborta y el servicio cae al mock para esa petición.
const TIMEOUT_MS = 6000;

// Forma parcial de la respuesta de Geoapify con `format=json` (con el
// formato GeoJSON por defecto habría que bajar hasta features[].properties).
// Solo se declara lo que se usa; todo opcional porque viene de la red y no
// hay ninguna garantía de que llegue completo.
interface GeoapifyResult {
  lat?: unknown;
  lon?: unknown;
  formatted?: unknown;
  country_code?: unknown;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function createGeoapifyGeocodingProvider(apiKey: string): GeocodingProvider {
  return {
    name: "GeoapifyGeocodingProvider",

    async geocodeCity(destination: string): Promise<GeocodedCity | undefined> {
      const url = new URL(GEOCODE_URL);
      url.searchParams.set("text", destination);
      // type=city evita que "Roma" resuelva a una calle o a un comercio
      // llamado Roma: para centrar un mapa de ciudad queremos la ciudad.
      url.searchParams.set("type", "city");
      url.searchParams.set("lang", "es");
      url.searchParams.set("limit", "1");
      url.searchParams.set("format", "json");
      url.searchParams.set("apiKey", apiKey);

      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

      if (!response.ok) {
        // El texto del cuerpo suele traer el motivo real (clave inválida,
        // cuota agotada). Se lanza para que el servicio lo registre y
        // reintente en la siguiente búsqueda, en vez de cachear el fallo.
        throw new Error(`Geoapify respondió ${response.status}: ${await response.text()}`);
      }

      const payload = (await response.json()) as { results?: GeoapifyResult[] };
      const first = payload.results?.[0];
      if (!first) {
        return undefined;
      }

      const lat = asFiniteNumber(first.lat);
      const lng = asFiniteNumber(first.lon);
      // Un resultado sin coordenadas usables es una respuesta rota, no un
      // "no existe": se trata como error para no cachearlo como definitivo.
      if (lat === undefined || lng === undefined) {
        throw new Error(`Geoapify devolvió un resultado sin coordenadas para "${destination}"`);
      }

      return {
        coordinates: { lat, lng },
        formattedName: asNonEmptyString(first.formatted),
        countryCode: asNonEmptyString(first.country_code),
      };
    },
  };
}
