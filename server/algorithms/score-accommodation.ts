import type { AccommodationOffer } from "../types/accommodation.js";
import { normalizeScore } from "./normalize-score.js";

export interface AccommodationScoreBreakdown {
  price: number;
  location: number;
  rating: number;
  conditions: number;
  groupFit: number;
  services: number;
}

export interface AccommodationScoreResult {
  score: number;
  breakdown: AccommodationScoreBreakdown;
}

// Sección 11.4.
const ACCOMMODATION_SCORE_WEIGHTS = {
  price: 0.3,
  location: 0.25,
  rating: 0.2,
  conditions: 0.1,
  groupFit: 0.1,
  services: 0.05,
};

// distanceToCenterKm y rating son opcionales en el modelo (sección 11.3):
// cuando faltan no penalizamos ni premiamos, se puntúan como neutros.
const NEUTRAL_SCORE = 50;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scoreAccommodation(
  accommodation: AccommodationOffer,
  candidates: AccommodationOffer[],
  travelers: number,
): AccommodationScoreResult {
  const prices = candidates.map((a) => a.totalPrice);
  const distances = candidates.map((a) => a.distanceToCenterKm).filter((d): d is number => d !== undefined);
  const ratings = candidates.map((a) => a.rating).filter((r): r is number => r !== undefined);
  const excessCapacities = candidates.map((a) => Math.max(0, a.capacity - travelers));

  const price = normalizeScore(accommodation.totalPrice, Math.min(...prices), Math.max(...prices), "lowerIsBetter");

  const location =
    accommodation.distanceToCenterKm === undefined || distances.length === 0
      ? NEUTRAL_SCORE
      : normalizeScore(accommodation.distanceToCenterKm, Math.min(...distances), Math.max(...distances), "lowerIsBetter");

  const rating =
    accommodation.rating === undefined || ratings.length === 0
      ? NEUTRAL_SCORE
      : normalizeScore(accommodation.rating, Math.min(...ratings), Math.max(...ratings), "higherIsBetter");

  // Condiciones no depende del resto de candidatos: cada condición aporta
  // una parte fija de los 100 puntos posibles.
  const conditions = (accommodation.breakfastIncluded ? 50 : 0) + (accommodation.freeCancellation ? 50 : 0);

  // Adecuación al grupo: capacidad insuficiente puntúa 0 (aunque el
  // descarte real de la combinación es responsabilidad de la Fase 8);
  // entre las que sí caben, menos capacidad "desperdiciada" puntúa mejor.
  const groupFit =
    accommodation.capacity < travelers
      ? 0
      : normalizeScore(
          Math.max(0, accommodation.capacity - travelers),
          Math.min(...excessCapacities),
          Math.max(...excessCapacities),
          "lowerIsBetter",
        );

  const services = normalizeScore(
    accommodation.amenities.length,
    Math.min(...candidates.map((a) => a.amenities.length)),
    Math.max(...candidates.map((a) => a.amenities.length)),
    "higherIsBetter",
  );

  const breakdown: AccommodationScoreBreakdown = { price, location, rating, conditions, groupFit, services };

  const score = round2(
    breakdown.price * ACCOMMODATION_SCORE_WEIGHTS.price +
      breakdown.location * ACCOMMODATION_SCORE_WEIGHTS.location +
      breakdown.rating * ACCOMMODATION_SCORE_WEIGHTS.rating +
      breakdown.conditions * ACCOMMODATION_SCORE_WEIGHTS.conditions +
      breakdown.groupFit * ACCOMMODATION_SCORE_WEIGHTS.groupFit +
      breakdown.services * ACCOMMODATION_SCORE_WEIGHTS.services,
  );

  return { score, breakdown };
}
