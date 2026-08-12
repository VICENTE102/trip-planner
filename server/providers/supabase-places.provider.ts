import type { ActivityCandidate, ActivitySearchRequest } from "../types/activity.js";
import type { StoredPlace } from "../types/place.js";
import { findPlacesByDestination } from "../repositories/places.repository.js";
import { normalizeCityName } from "../utils/text.js";

function toActivityCandidate(place: StoredPlace): ActivityCandidate {
  return {
    id: place.id,
    // El nombre real del sitio, sin adornos: "Museo Nazionale Etrusco di
    // Villa Giulia", no "Entrada al museo principal (Roma)".
    name: place.name,
    category: place.basicCategory,
    profile: place.profile,
    latitude: place.latitude,
    longitude: place.longitude,
    // `confidence` de Overture es la probabilidad de que el sitio exista, no
    // una valoración de usuarios. No se mapea a `rating` para no hacerla
    // pasar por lo que no es (y el motor no usa rating en actividades).
    pricePerPerson: place.pricePerPerson,
    estimatedDurationMinutes: place.durationMinutes,
    openingHours: place.openingHours,
    bookingRequired: false,
    bookingUrl: place.website,
    // "partial" y no "verified": el sitio y su ubicación son reales, pero el
    // precio, la duración y el horario los estimamos por categoría.
    verificationStatus: "partial",
  };
}

// Actividades reales de Overture ya cargadas en Supabase (ver
// scripts/load-overture-pois.ts). No implementa PlacesProvider a propósito:
// devuelve undefined cuando el destino no está cargado, y esa distinción
// —que la interfaz no puede expresar— es justo lo que necesita
// places.provider.ts para decidir si cae al mock.
export async function searchStoredActivities(
  request: ActivitySearchRequest,
): Promise<ActivityCandidate[] | undefined> {
  const places = await findPlacesByDestination(normalizeCityName(request.destination));
  return places?.map(toActivityCandidate);
}
