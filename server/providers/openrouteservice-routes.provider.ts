import type { RoutePlace } from "../types/route.js";

const MATRIX_URL = "https://api.openrouteservice.org/v2/matrix";

// Perfil a pie: es el trayecto que de verdad hace un turista entre dos
// sitios del centro, y el único que ORS puede darnos de verdad — su API
// pública no tiene transporte público (los perfiles son coche, bici, a pie
// y silla de ruedas). Lo que no sea andable se sigue estimando, ver
// services/routes.service.ts.
export const WALKING_PROFILE = "foot-walking";

// Una búsqueda espera a esto antes de poder construir el itinerario, así
// que no puede quedarse colgada.
const TIMEOUT_MS = 8000;

// ORS admite 3.500 pares por petición (50x50). Nosotros pedimos como mucho
// 3 hoteles + ~10 actividades = 169 celdas, pero el límite se comprueba
// igualmente: si algún día crece la selección, es mejor un error claro aquí
// que un 4xx del proveedor.
const MAX_LOCATIONS = 50;

export interface RouteLeg {
  fromId: string;
  toId: string;
  durationSeconds: number;
  distanceKm: number;
}

interface MatrixResponse {
  durations?: (number | null)[][];
  distances?: (number | null)[][];
}

export function createOpenRouteServiceProvider(apiKey: string) {
  return {
    name: "OpenRouteServiceRoutesProvider",
    profile: WALKING_PROFILE,

    // Devuelve un tramo por cada par ordenado (from -> to) con from != to.
    // Los pares que ORS no sabe resolver (un punto aislado sin calles
    // cerca) se omiten en vez de inventarse: quien llama decide qué hacer
    // con los que falten.
    async calculateLegs(places: RoutePlace[]): Promise<RouteLeg[]> {
      if (places.length < 2) return [];
      if (places.length > MAX_LOCATIONS) {
        throw new Error(`Demasiados puntos para una matriz de ORS: ${places.length} (máximo ${MAX_LOCATIONS})`);
      }

      const response = await fetch(`${MATRIX_URL}/${WALKING_PROFILE}`, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // ORS espera [longitud, latitud], al revés de como se leen y se
          // guardan en todo el resto del proyecto. Invertirlo manda la
          // consulta al otro lado del mundo sin dar ningún error.
          locations: places.map((place) => [place.longitude, place.latitude]),
          metrics: ["duration", "distance"],
          units: "km",
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`OpenRouteService respondió ${response.status}: ${await response.text()}`);
      }

      const payload = (await response.json()) as MatrixResponse;
      const { durations, distances } = payload;
      if (!Array.isArray(durations) || !Array.isArray(distances)) {
        throw new Error("OpenRouteService devolvió una matriz sin durations o sin distances");
      }

      const legs: RouteLeg[] = [];
      for (let i = 0; i < places.length; i++) {
        for (let j = 0; j < places.length; j++) {
          if (i === j) continue;
          const durationSeconds = durations[i]?.[j];
          const distanceKm = distances[i]?.[j];
          // null es la forma que tiene ORS de decir "no encuentro ruta".
          if (typeof durationSeconds !== "number" || typeof distanceKm !== "number") continue;

          legs.push({ fromId: places[i].id, toId: places[j].id, durationSeconds, distanceKm });
        }
      }

      return legs;
    },
  };
}

export type OpenRouteServiceProvider = ReturnType<typeof createOpenRouteServiceProvider>;
