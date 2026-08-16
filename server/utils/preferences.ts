import type { PreferenceProfile, TravelPreference } from "../types/trip.js";

// Orden canónico de las ocho preferencias. Estaba duplicado en
// combine-offers.ts y en activities.mock.ts; vive aquí para que no haya tres
// listas que puedan divergir al añadir una preferencia nueva.
export const ALL_PREFERENCES: TravelPreference[] = [
  "beach",
  "culture",
  "gastronomy",
  "nightlife",
  "nature",
  "shopping",
  "family",
  "relax",
];

// La preferencia con la que más encaja un sitio. Es lo que viaja hasta la
// interfaz para elegir la foto de la tarjeta del día y su etiqueta
// ("Playa", "Sabores"...): ocho valores estables, en vez de las ~2.100
// categorías finas de Overture o las 46 que mapeamos al cargar.
//
// Devuelve undefined si el perfil es todo ceros: sin afinidad con nada, no
// hay tema que representar, y eso es distinto de "es una playa".
export function dominantPreference(profile: PreferenceProfile): TravelPreference | undefined {
  let best: TravelPreference | undefined;
  let bestLevel = 0;

  for (const key of ALL_PREFERENCES) {
    if (profile[key] > bestLevel) {
      best = key;
      bestLevel = profile[key];
    }
  }

  return best;
}
