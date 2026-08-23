import type { ActivityCandidate, ActivitySearchRequest, PlacesProvider } from "../types/activity.js";
import { searchStoredActivities } from "./supabase-places.provider.js";
import { mockPlacesProvider } from "./mock-places.provider.js";
import { recordCacheHit, recordCacheMiss, type CacheTally } from "../services/cache-stats.service.js";

// Punto único donde se decide de dónde salen las actividades de un destino.
//
// Los POI reales solo existen para las ciudades que se hayan cargado con
// scripts/load-overture-pois.ts. Para el resto —y son la mayoría del mundo—
// se sigue usando el generador simulado, que garantiza actividades de las 8
// preferencias y mantiene la app utilizable en cualquier destino en vez de
// devolver un viaje sin nada que hacer.
export const placesProvider: PlacesProvider = {
  async searchActivities(request: ActivitySearchRequest, tally?: CacheTally): Promise<ActivityCandidate[]> {
    const stored = await searchStoredActivities(request);
    if (stored && stored.length > 0) {
      recordCacheHit(tally, "places");
      return stored;
    }
    // Un fallo aquí no es lo mismo que en las otras dos cachés: no significa
    // "hay que ir a pedirlo fuera", significa "esta ciudad no está cargada y
    // el viaje se va a inventar las actividades". Por eso cuenta como fallo:
    // es exactamente lo que hay que ver subir para saber qué destinos hay que
    // añadir al cargador.
    recordCacheMiss(tally, "places");
    console.info(`[places] "${request.destination}" sin POI cargados; se usan actividades simuladas.`);
    return mockPlacesProvider.searchActivities(request);
  },
};
