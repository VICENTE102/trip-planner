import type { PreferenceProfile, TravelPreference } from "./trip.js";
import type { Coordinates } from "./geocoding.js";

export interface OpeningPeriod {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  opensAt: string;
  closesAt: string;
}

export interface ActivityCandidate {
  id: string;
  name: string;
  // Categoría en el vocabulario del proveedor: temas en español en el mock,
  // `basic_category` de Overture en los sitios reales. Sirve para depurar y
  // para filtrar; NO para decidir nada en la interfaz, porque cada proveedor
  // habla su idioma.
  category: string;
  // Preferencia dominante (ver utils/preferences.ts). Este sí es vocabulario
  // común a todos los proveedores, y es lo que llega a la tarjeta del día
  // para elegir su foto y su etiqueta.
  preference?: TravelPreference;
  profile: PreferenceProfile;
  latitude: number;
  longitude: number;
  rating?: number;
  pricePerPerson?: number;
  estimatedDurationMinutes: number;
  openingHours?: OpeningPeriod[];
  bookingRequired?: boolean;
  bookingUrl?: string;
  verificationStatus: "verified" | "partial" | "unverified";
}

export interface ActivitySearchRequest {
  destination: string;
  // Ver AccommodationSearchRequest.center: lo resuelve el orquestador una
  // sola vez y se lo pasa a los dos proveedores.
  center: Coordinates;
  preferences: PreferenceProfile;
}

export interface PlacesProvider {
  searchActivities(request: ActivitySearchRequest): Promise<ActivityCandidate[]>;
}
