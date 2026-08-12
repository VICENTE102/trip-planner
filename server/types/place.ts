import type { PreferenceProfile, TravelPreference } from "./trip.js";
import type { OpeningPeriod } from "./activity.js";

// Un punto de interés real ya cargado en Supabase desde Overture Maps.
// Es lo que devuelve places.repository.ts antes de convertirse en el
// ActivityCandidate que consume el motor.
//
// La distinción importante: name, coordinates y website son datos reales
// verificables; profile, durationMinutes y pricePerPerson son estimaciones
// nuestras derivadas de la categoría, porque Overture no publica ni precios
// ni duraciones ni horarios. De ahí que estas actividades lleguen al
// itinerario como "partial" y no como "verified".
export interface StoredPlace {
  id: string;
  destinationKey: string;
  name: string;
  latitude: number;
  longitude: number;
  basicCategory: string;
  preference: TravelPreference;
  profile: PreferenceProfile;
  durationMinutes: number;
  pricePerPerson: number;
  openingHours?: OpeningPeriod[];
  confidence?: number;
  website?: string;
}
