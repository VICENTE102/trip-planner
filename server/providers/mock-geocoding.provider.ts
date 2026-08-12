import type { GeocodedCity, GeocodingProvider } from "../types/geocoding.js";
import { createSeededRandom, hashString } from "../utils/random.js";

// Respaldo: las coordenadas ficticias que usaba todo el backend antes del
// Paso 2 (antes vivían en server/utils/geo.ts como fakeCityCenter). No son
// geolocalización real — un viaje a Roma puede caer en mitad del mar — pero
// son deterministas, así que los alojamientos y actividades simulados de un
// mismo destino se siguen agrupando de forma coherente entre sí.
//
// Sigue existiendo por dos motivos: que `npm run dev` funcione sin
// GEOAPIFY_API_KEY configurada, y que un fallo de la API no tumbe una
// búsqueda. Nunca devuelve undefined: para cualquier texto hay un centro.
// `satisfies` en vez de anotar el tipo: cumple GeocodingProvider pero
// conserva el retorno más estrecho (GeocodedCity, nunca undefined), que es
// justo lo que permite usarlo como último recurso sin comprobar nada.
export const mockGeocodingProvider = {
  name: "MockGeocodingProvider",

  async geocodeCity(destination: string): Promise<GeocodedCity> {
    const random = createSeededRandom(hashString(`center-${destination}`));
    return {
      coordinates: {
        lat: 36 + random() * 20, // rango aproximado de latitudes europeas
        lng: -9 + random() * 35, // rango aproximado de longitudes europeas
      },
    };
  },
} satisfies GeocodingProvider;
