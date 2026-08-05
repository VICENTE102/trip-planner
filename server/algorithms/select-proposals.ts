import type {
  PreferenceProfile,
  ProposalType,
  ScoreBreakdown,
  TravelPreference,
  TripCombination,
  TripProposal,
} from "../types/trip.js";
import { calculateTripScore } from "./calculate-trip-score.js";

export interface ScoredCombination {
  combination: TripCombination;
  scoreBreakdown: ScoreBreakdown;
}

export interface SelectProposalsContext {
  userBudget: number;
  travelers: number;
  preferences: PreferenceProfile;
  evaluatedCombinations: number;
  discardedCombinations: number;
}

// Sección 10.6: cada perfil pondera los mismos 6 criterios de forma
// distinta para que las tres propuestas no acaben siendo la misma
// combinación con una etiqueta diferente. "Recomendada" usa exactamente
// los pesos globales de la sección 10.2.
const PROFILE_WEIGHTS: Record<ProposalType, Record<keyof ScoreBreakdown, number>> = {
  economical: {
    price: 0.55,
    accommodationQuality: 0.15,
    location: 0.05,
    transportComfort: 0.1,
    usableTime: 0.05,
    preferenceMatch: 0.1,
  },
  recommended: {
    price: 0.25,
    accommodationQuality: 0.2,
    location: 0.15,
    transportComfort: 0.15,
    usableTime: 0.1,
    preferenceMatch: 0.15,
  },
  comfort: {
    price: 0.05,
    accommodationQuality: 0.3,
    location: 0.25,
    transportComfort: 0.25,
    usableTime: 0.05,
    preferenceMatch: 0.1,
  },
};

const PROPOSAL_ORDER: ProposalType[] = ["economical", "recommended", "comfort"];

const PREFERENCE_LABELS: Record<TravelPreference, string> = {
  beach: "la playa",
  culture: "la cultura",
  gastronomy: "la gastronomía",
  nightlife: "la vida nocturna",
  nature: "la naturaleza",
  shopping: "las compras",
  family: "los planes en familia",
  relax: "el relax",
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function weightedScore(breakdown: ScoreBreakdown, weights: Record<keyof ScoreBreakdown, number>): number {
  return (Object.keys(weights) as Array<keyof ScoreBreakdown>).reduce(
    (sum, criterion) => sum + breakdown[criterion] * weights[criterion],
    0,
  );
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// Sección 10.7: explica en lenguaje natural por qué se seleccionó la
// combinación, a partir de los mismos números ya calculados (nunca texto
// inventado sobre datos que no tenemos).
function buildReasons(
  combination: TripCombination,
  scoreBreakdown: ScoreBreakdown,
  context: SelectProposalsContext,
): string[] {
  const reasons: string[] = [];
  const totalCost = combination.budget.totalTripCost;

  if (totalCost < context.userBudget) {
    const percentBelow = Math.round((1 - totalCost / context.userBudget) * 100);
    if (percentBelow >= 3) {
      reasons.push(`Está un ${percentBelow}% por debajo del presupuesto.`);
    }
  }

  if (combination.accommodation.distanceToCenterKm !== undefined) {
    reasons.push(`El alojamiento se encuentra a ${formatDistance(combination.accommodation.distanceToCenterKm)} del centro.`);
  }

  if (combination.flight.stops === 0) {
    reasons.push("El vuelo de ida es directo, sin escalas.");
  }

  if (scoreBreakdown.preferenceMatch >= 70) {
    const topPreferences = (Object.keys(context.preferences) as TravelPreference[])
      .filter((key) => context.preferences[key] > 0)
      .sort((a, b) => context.preferences[b] - context.preferences[a])
      .slice(0, 2)
      .map((key) => PREFERENCE_LABELS[key]);
    if (topPreferences.length > 0) {
      reasons.push(`La afinidad con ${topPreferences.join(" y ")} es alta.`);
    }
  }

  if (combination.accommodation.rating !== undefined && combination.accommodation.rating >= 4.3) {
    reasons.push(`El alojamiento tiene una valoración de ${combination.accommodation.rating}/5.`);
  }

  return reasons;
}

function buildWarnings(combination: TripCombination): string[] {
  const warnings: string[] = [
    "Datos simulados: vuelos, alojamiento y actividades son estimaciones generadas automáticamente, pendientes de verificación con proveedores reales.",
  ];

  if (!combination.flight.baggageIncluded) {
    warnings.push("El equipaje facturado no está incluido.");
  }
  if (!combination.accommodation.freeCancellation) {
    warnings.push("La reserva no admite cancelación gratuita.");
  }
  if (combination.flight.stops > 0) {
    warnings.push(`El vuelo de ida tiene ${combination.flight.stops} escala(s).`);
  }

  return warnings;
}

function buildProposal(type: ProposalType, scored: ScoredCombination, context: SelectProposalsContext): TripProposal {
  const { combination, scoreBreakdown } = scored;

  return {
    type,
    // El score reportado usa siempre los pesos estándar de la sección
    // 10.2 (no los del perfil que la seleccionó), para que las tres
    // propuestas sean comparables entre sí con la misma vara de medir.
    score: calculateTripScore(scoreBreakdown),
    rank: 0, // se asigna al final, una vez elegidas las tres propuestas
    scoreBreakdown,
    flight: combination.flight,
    accommodation: combination.accommodation,
    itinerary: [], // Fase 10
    budget: combination.budget,
    totalCost: combination.budget.totalTripCost,
    costPerPerson: round2(combination.budget.totalTripCost / context.travelers),
    evaluatedCombinations: context.evaluatedCombinations,
    discardedCombinations: context.discardedCombinations,
    reasons: buildReasons(combination, scoreBreakdown, context),
    warnings: buildWarnings(combination),
  };
}

// Sección 21 (Fase 8), pasos 7-8: elige económica/recomendada/confort
// entre las combinaciones supervivientes (ya validadas y no dominadas),
// evitando repetir la misma combinación en dos perfiles distintos.
export function selectDiverseProposals(
  scoredCombinations: ScoredCombination[],
  context: SelectProposalsContext,
): TripProposal[] {
  const usedCombinationIds = new Set<string>();
  const proposals: TripProposal[] = [];

  for (const type of PROPOSAL_ORDER) {
    const weights = PROFILE_WEIGHTS[type];
    const winner = [...scoredCombinations]
      .filter((scored) => !usedCombinationIds.has(scored.combination.id))
      .sort((a, b) => weightedScore(b.scoreBreakdown, weights) - weightedScore(a.scoreBreakdown, weights))[0];

    if (!winner) continue; // no quedan combinaciones distintas disponibles para este perfil

    usedCombinationIds.add(winner.combination.id);
    proposals.push(buildProposal(type, winner, context));
  }

  [...proposals]
    .sort((a, b) => b.score - a.score)
    .forEach((proposal, index) => {
      proposal.rank = index + 1;
    });

  return proposals;
}
