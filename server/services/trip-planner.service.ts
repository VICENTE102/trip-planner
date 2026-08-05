import type { ValidatedTripRequest } from "../schemas/trip.schema.js";
import type { PreferenceProfile, TripProposal } from "../types/trip.js";
import { mockFlightProvider } from "../providers/mock-flight.provider.js";
import { mockAccommodationProvider } from "../providers/mock-accommodation.provider.js";
import { mockPlacesProvider } from "../providers/mock-places.provider.js";
import { buildScoreBreakdown, combineOffers } from "../algorithms/combine-offers.js";
import { passesQualityThresholds, validateCombination } from "../algorithms/validate-trip.js";
import { filterDominatedOptions } from "../algorithms/pareto-filter.js";
import { selectDiverseProposals } from "../algorithms/select-proposals.js";

export interface GenerateTripResult {
  proposals: TripProposal[];
  evaluatedCombinations: number;
  discardedCombinations: number;
}

// Días completos de viaje (llegada y salida cuentan cada uno como un día),
// usado para los mínimos diarios de allocateBudget() y para elegir cuántas
// actividades seleccionar por combinación.
function tripDays(departureDate: Date, returnDate: Date): number {
  const nights = Math.round((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24));
  return nights + 1;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Coordina Fases 5-8: pide ofertas simuladas a los tres proveedores mock,
// construye todas las combinaciones posibles, las valida y puntúa, y
// selecciona las tres propuestas finales. Es el único punto que conoce el
// pipeline completo — api/trips/generate.ts solo lo llama y da forma a la
// respuesta HTTP.
export async function generateTripProposals(request: ValidatedTripRequest): Promise<GenerateTripResult> {
  const travelers = request.travelers.adults + request.travelers.children;
  const days = tripDays(request.departureDate, request.returnDate);
  const departureDateIso = toIsoDate(request.departureDate);
  const returnDateIso = toIsoDate(request.returnDate);
  // Zod ya ha validado en tiempo de ejecución que cada preferencia es un
  // entero 0-3 (preferenceLevelSchema), pero z.number().int().min().max()
  // se infiere como `number`, no como el literal 0|1|2|3 de PreferenceLevel
  // — este cast solo alinea el tipo con esa garantía ya comprobada.
  const preferences = request.preferences as PreferenceProfile;

  const [flights, accommodations, activities] = await Promise.all([
    mockFlightProvider.searchFlights({
      origin: request.origin,
      destination: request.destination,
      departureDate: departureDateIso,
      returnDate: returnDateIso,
      adults: request.travelers.adults,
      children: request.travelers.children,
    }),
    mockAccommodationProvider.searchAccommodations({
      destination: request.destination,
      checkInDate: departureDateIso,
      checkOutDate: returnDateIso,
      adults: request.travelers.adults,
      children: request.travelers.children,
    }),
    mockPlacesProvider.searchActivities({
      destination: request.destination,
      preferences,
    }),
  ]);

  const combinations = combineOffers(flights, accommodations, activities, {
    travelers,
    days,
    userBudget: request.budget,
    preferences,
  });

  const scored = combinations.map((combination) => ({
    combination,
    scoreBreakdown: buildScoreBreakdown(combination, {
      allCombinations: combinations,
      allFlights: flights,
      allAccommodations: accommodations,
      travelers,
      preferences,
    }),
  }));

  const validScored = scored.filter(
    ({ combination, scoreBreakdown }) =>
      validateCombination(combination, { userBudget: request.budget, travelers }).valid &&
      passesQualityThresholds(scoreBreakdown),
  );

  const nonDominated = filterDominatedOptions(validScored, (s) => s.scoreBreakdown);
  const discardedCombinations = combinations.length - nonDominated.length;

  const proposals = selectDiverseProposals(nonDominated, {
    userBudget: request.budget,
    travelers,
    preferences,
    evaluatedCombinations: combinations.length,
    discardedCombinations,
  });

  return { proposals, evaluatedCombinations: combinations.length, discardedCombinations };
}
