import type { ScoreBreakdown } from "../types/trip.js";

// Sección 10.2. Esta función solo aplica los pesos sobre un ScoreBreakdown
// ya calculado (0-100 en cada criterio) — construir ese breakdown a partir
// de una combinación real de vuelo/alojamiento/actividades es
// responsabilidad de combineOffers() (Fase 8), que es quien tiene el
// contexto completo (todas las combinaciones candidatas) para decidir cómo
// se derivan "location" o "usableTime" a nivel de viaje.
const TRIP_SCORE_WEIGHTS = {
  price: 0.25,
  accommodationQuality: 0.2,
  location: 0.15,
  transportComfort: 0.15,
  usableTime: 0.1,
  preferenceMatch: 0.15,
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateTripScore(breakdown: ScoreBreakdown): number {
  return round2(
    breakdown.price * TRIP_SCORE_WEIGHTS.price +
      breakdown.accommodationQuality * TRIP_SCORE_WEIGHTS.accommodationQuality +
      breakdown.location * TRIP_SCORE_WEIGHTS.location +
      breakdown.transportComfort * TRIP_SCORE_WEIGHTS.transportComfort +
      breakdown.usableTime * TRIP_SCORE_WEIGHTS.usableTime +
      breakdown.preferenceMatch * TRIP_SCORE_WEIGHTS.preferenceMatch,
  );
}

// Sección 10.4: una media alta no debe ocultar una deficiencia grave en un
// criterio esencial. Se expone aparte de calculateTripScore() para que la
// Fase 8 (filterDominatedOptions / validateCombination) la reutilice sin
// duplicar los umbrales.
const MINIMUM_SCORES = {
  location: 45,
  accommodationQuality: 55,
  transportComfort: 40,
  preferenceMatch: 50,
};

export interface MinimumScoresCheck {
  passes: boolean;
  failedCriteria: Array<keyof typeof MINIMUM_SCORES>;
}

export function meetsMinimumScores(breakdown: ScoreBreakdown): MinimumScoresCheck {
  const failedCriteria = (Object.keys(MINIMUM_SCORES) as Array<keyof typeof MINIMUM_SCORES>).filter(
    (criterion) => breakdown[criterion] < MINIMUM_SCORES[criterion],
  );

  return { passes: failedCriteria.length === 0, failedCriteria };
}
