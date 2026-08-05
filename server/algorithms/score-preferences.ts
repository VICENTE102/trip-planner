import type { PreferenceProfile } from "../types/trip.js";

// Sección 6.2: media ponderada del perfil de la opción según el peso que
// el usuario da a cada preferencia (0 = ignorar esa preferencia).
//
// El documento da el algoritmo tal cual (bucle + media ponderada) pero su
// resultado literal queda acotado a la escala 0-3 de PreferenceLevel,
// mientras que el resto del motor de puntuación (normalizeScore,
// minimumScores, calculateTripScore) trabaja en escala 0-100 — y el propio
// valor de repliegue "50" del documento solo tiene sentido como punto
// medio de una escala 0-100. Para que ambas partes sean consistentes, el
// resultado se reescala aquí de [0,3] a [0,100] (factor 100/3); el
// repliegue se mantiene literal en 50, tal como especifica el documento.
const MAX_PREFERENCE_LEVEL = 3;
const NEUTRAL_FALLBACK_SCORE = 50;

export function calculatePreferenceScore(
  userPreferences: PreferenceProfile,
  optionProfile: PreferenceProfile,
): number {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const key of Object.keys(userPreferences) as Array<keyof PreferenceProfile>) {
    const weight = userPreferences[key];
    if (weight === 0) continue;
    weightedScore += optionProfile[key] * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return NEUTRAL_FALLBACK_SCORE;
  }

  return Math.round((weightedScore / totalWeight) * (100 / MAX_PREFERENCE_LEVEL) * 100) / 100;
}
