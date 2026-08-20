import type { ItineraryDay } from "../types/itinerary.js";
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
  // Fase 10: construir el itinerario (clustering + reglas de horario) es
  // responsabilidad de otro módulo (server/algorithms/schedule-itinerary.ts
  // + cluster-places.ts), orquestado por trip-planner.service.ts. Aquí
  // solo se necesita el resultado para la combinación ganadora — se recibe
  // como función en vez de importar esos módulos directamente, para no
  // acoplar "elegir la mejor combinación" con "cómo se construye su
  // itinerario". Solo se llama 3 veces (una por propuesta final), nunca
  // sobre las 270 combinaciones candidatas.
  buildItinerary: (combination: TripCombination) => Promise<ItineraryDay[]>;
}

// Pesos de la propuesta equilibrada: los mismos de la sección 10.2.
const BALANCED_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  price: 0.25,
  accommodationQuality: 0.2,
  location: 0.15,
  transportComfort: 0.15,
  usableTime: 0.1,
  preferenceMatch: 0.15,
};

// Pesos de la propuesta cómoda. El precio pesa CERO a propósito: es la
// única de las tres que no debe premiarse por ser barata. Con el precio
// dentro, aunque fuera al 5%, la cómoda seguía prefiriendo lo barato y
// dejaba sin usar la mitad del presupuesto.
const COMFORT_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  price: 0,
  accommodationQuality: 0.35,
  location: 0.25,
  transportComfort: 0.25,
  usableTime: 0.05,
  preferenceMatch: 0.1,
};

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

async function buildProposal(
  type: ProposalType,
  scored: ScoredCombination,
  context: SelectProposalsContext,
): Promise<TripProposal> {
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
    itinerary: await context.buildItinerary(combination),
    budget: combination.budget,
    totalCost: combination.budget.totalTripCost,
    costPerPerson: round2(combination.budget.totalTripCost / context.travelers),
    evaluatedCombinations: context.evaluatedCombinations,
    discardedCombinations: context.discardedCombinations,
    reasons: buildReasons(combination, scoreBreakdown, context),
    warnings: buildWarnings(combination),
  };
}

const cost = (scored: ScoredCombination) => scored.combination.budget.totalTripCost;

// Elige el mejor según `compare`, prefiriendo los que NO repiten alojamiento
// ya usado. Es una preferencia, no un filtro: si todos los candidatos
// comparten hotel se devuelve el mejor igualmente, en vez de quedarse sin
// propuesta.
//
// Importa cuando el presupuesto deja pocas opciones vivas: en una búsqueda
// de 8 días para una persona con 2.000 € solo sobreviven 6 combinaciones, y
// sin esto las tres propuestas salían con el mismo hotel y solo cambiaba el
// vuelo.
function bestPreferringNewHotel(
  candidates: ScoredCombination[],
  usedHotelIds: Set<string>,
  compare: (a: ScoredCombination, b: ScoredCombination) => number,
): ScoredCombination | undefined {
  const fresh = candidates.filter((scored) => !usedHotelIds.has(scored.combination.accommodation.id));
  return [...(fresh.length > 0 ? fresh : candidates)].sort(compare)[0];
}

// Sección 21 (Fase 8), pasos 7-8: elige económica / equilibrada / cómoda
// entre las combinaciones supervivientes (ya validadas y no dominadas).
//
// Se eligen POR CONSTRUCCIÓN, no con tres ponderaciones que compiten entre
// sí. Antes cada perfil ordenaba el mismo fondo con pesos distintos y se
// quedaba con el primero, lo cual no garantizaba nada: el perfil económico
// tenía un 45% de su peso en criterios que no son el precio, así que una
// combinación algo más cara pero mejor en alojamiento o transporte le
// ganaba. El resultado era que "Económico" salía costando MÁS que
// "Equilibrado" — lo primero que ve el usuario, y contradice la etiqueta.
//
// Ahora el invariante económica <= equilibrada <= cómoda se cumple porque
// cada una se busca dentro del tramo de precio que le corresponde:
//
//   económica  = la más barata del fondo
//   cómoda     = la de mejor calidad ENTRE LAS QUE CUESTAN MÁS que la económica
//   equilibrada = la mejor puntuada ENTRE LAS DOS
//
// Si los datos no dan para tres tramos distintos se devuelven menos
// propuestas. Es preferible enseñar dos opciones honestas que tres mal
// etiquetadas.
export async function selectDiverseProposals(
  scoredCombinations: ScoredCombination[],
  context: SelectProposalsContext,
): Promise<TripProposal[]> {
  if (scoredCombinations.length === 0) {
    return [];
  }

  // 1. Económica: la más barata. A igual precio, la mejor puntuada.
  const economical = [...scoredCombinations].sort(
    (a, b) => cost(a) - cost(b) || calculateTripScore(b.scoreBreakdown) - calculateTripScore(a.scoreBreakdown),
  )[0];

  // 2. Cómoda: mejor calidad entre las que cuestan estrictamente más. A
  //    igualdad de calidad gana la que más presupuesto aprovecha, que es lo
  //    que evita que con 3.000 € se proponga el mismo hotel que con 1.500 €.
  const usedHotelIds = new Set([economical.combination.accommodation.id]);

  const comfort = bestPreferringNewHotel(
    scoredCombinations.filter((scored) => cost(scored) > cost(economical)),
    usedHotelIds,
    (a, b) =>
      weightedScore(b.scoreBreakdown, COMFORT_WEIGHTS) - weightedScore(a.scoreBreakdown, COMFORT_WEIGHTS) ||
      cost(b) - cost(a),
  );
  if (comfort) usedHotelIds.add(comfort.combination.accommodation.id);

  // 3. Equilibrada: la mejor puntuada dentro del tramo intermedio, y con un
  //    nivel que tampoco baje. El precio por sí solo no basta: sin esto, la
  //    equilibrada podía costar más que la económica y aun así llevar un
  //    hotel peor valorado, que es exactamente lo que la etiqueta niega.
  //
  //    "Nivel" se mide con los mismos pesos de calidad de la cómoda, que es
  //    la escala en la que están ordenadas las tres.
  const quality = (scored: ScoredCombination) => weightedScore(scored.scoreBreakdown, COMFORT_WEIGHTS);
  const qualityFloor = quality(economical);
  const qualityCeiling = comfort ? quality(comfort) : Number.POSITIVE_INFINITY;

  const upperBound = comfort ? cost(comfort) : Number.POSITIVE_INFINITY;
  const inMiddleBand = scoredCombinations.filter(
    (scored) =>
      scored.combination.id !== economical.combination.id &&
      scored.combination.id !== comfort?.combination.id &&
      cost(scored) >= cost(economical) &&
      cost(scored) <= upperBound,
  );

  // El nivel manda sobre el hotel distinto: es preferible repetir
  // alojamiento a etiquetar como "equilibrado" algo peor que lo económico.
  // Si ninguna candidata cumple el escalón de calidad, se relaja antes que
  // quedarse sin propuesta intermedia.
  const withinQuality = inMiddleBand.filter(
    (scored) => quality(scored) >= qualityFloor && quality(scored) <= qualityCeiling,
  );

  const recommended = bestPreferringNewHotel(
    withinQuality.length > 0 ? withinQuality : inMiddleBand,
    usedHotelIds,
    (a, b) => weightedScore(b.scoreBreakdown, BALANCED_WEIGHTS) - weightedScore(a.scoreBreakdown, BALANCED_WEIGHTS),
  );

  const chosen: { type: ProposalType; scored: ScoredCombination }[] = [
    { type: "economical", scored: economical },
    ...(recommended ? [{ type: "recommended" as const, scored: recommended }] : []),
    ...(comfort ? [{ type: "comfort" as const, scored: comfort }] : []),
  ];

  const proposals: TripProposal[] = [];
  for (const { type, scored } of chosen) {
    proposals.push(await buildProposal(type, scored, context));
  }

  [...proposals]
    .sort((a, b) => b.score - a.score)
    .forEach((proposal, index) => {
      proposal.rank = index + 1;
    });

  return proposals;
}
