import type { ActivityCandidate, ActivitySearchRequest, PlacesProvider } from "../types/activity.js";
import { searchStoredActivities } from "./supabase-places.provider.js";
import { mockPlacesProvider } from "./mock-places.provider.js";

// Punto único donde se decide de dónde salen las actividades de un destino.
//
// Los POI reales solo existen para las ciudades que se hayan cargado con
// scripts/load-overture-pois.ts. Para el resto —y son la mayoría del mundo—
// se sigue usando el generador simulado, que garantiza actividades de las 8
// preferencias y mantiene la app utilizable en cualquier destino en vez de
// devolver un viaje sin nada que hacer.
export const placesProvider: PlacesProvider = {
  async searchActivities(request: ActivitySearchRequest): Promise<ActivityCandidate[]> {
    const stored = await searchStoredActivities(request);
    if (stored && stored.length > 0) {
      return stored;
    }
    console.info(`[places] "${request.destination}" sin POI cargados; se usan actividades simuladas.`);
    return mockPlacesProvider.searchActivities(request);
  },
};
