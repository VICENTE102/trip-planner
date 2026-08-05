import type { ScoreBreakdown } from "../types/trip.js";

const CRITERIA: Array<keyof ScoreBreakdown> = [
  "price",
  "accommodationQuality",
  "location",
  "transportComfort",
  "usableTime",
  "preferenceMatch",
];

// Sección 10.5: "a" domina a "b" si es igual o mejor en todos los
// criterios y estrictamente mejor en al menos uno. Como todos los
// criterios de ScoreBreakdown ya están normalizados 0-100 con "más alto
// es mejor", la comparación es directa sin necesitar más contexto.
function dominates(a: ScoreBreakdown, b: ScoreBreakdown): boolean {
  let strictlyBetterInAtLeastOne = false;
  for (const criterion of CRITERIA) {
    if (a[criterion] < b[criterion]) return false;
    if (a[criterion] > b[criterion]) strictlyBetterInAtLeastOne = true;
  }
  return strictlyBetterInAtLeastOne;
}

// Genérica en T: cualquier colección de opciones comparables por
// ScoreBreakdown puede pasar por aquí, no solo TripCombination.
export function filterDominatedOptions<T>(options: T[], getScoreBreakdown: (option: T) => ScoreBreakdown): T[] {
  const breakdowns = options.map(getScoreBreakdown);

  return options.filter((_, index) => {
    const candidate = breakdowns[index];
    return !breakdowns.some((other, otherIndex) => otherIndex !== index && dominates(other, candidate));
  });
}
