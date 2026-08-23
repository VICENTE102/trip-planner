import type { ValidatedTripRequest } from "../schemas/trip.schema.js";
import type { ItineraryDay } from "../types/itinerary.js";
import type { TravelMatrixEntry } from "../types/route.js";
import type { PreferenceProfile, ProviderSearchLog, TripCombination, TripProposal } from "../types/trip.js";
import { mockFlightProvider } from "../providers/mock-flight.provider.js";
import { mockAccommodationProvider } from "../providers/mock-accommodation.provider.js";
import { placesProvider } from "../providers/places.provider.js";
import { buildScoreBreakdown, combineOffers } from "../algorithms/combine-offers.js";
import { analyzeBudgetUnlock, type BudgetUnlock } from "../algorithms/budget-unlock.js";
import { passesQualityThresholds, validateCombination, validateItinerary, repairInvalidItinerary } from "../algorithms/validate-trip.js";
import { filterDominatedOptions } from "../algorithms/pareto-filter.js";
import { selectDiverseProposals } from "../algorithms/select-proposals.js";
import { buildTravelMatrixLookup } from "../algorithms/cluster-places.js";
import { distributePlacesAcrossDays, scheduleDayActivities } from "../algorithms/schedule-itinerary.js";
import { resolveCityCenter } from "./geocoding.service.js";
import { resolveTravelMatrix } from "./routes.service.js";
import { createCacheTally, reportCacheTally } from "./cache-stats.service.js";

export interface GenerateTripResult {
  proposals: TripProposal[];
  evaluatedCombinations: number;
  discardedCombinations: number;
  // Coste de la combinación más barata que se llegó a evaluar, aunque no
  // sobreviviera a la validación. Es lo único que permite explicarle al
  // usuario *cuánto* le falta cuando no hay ninguna propuesta viable
  // ("la opción más económica son 962 €") en vez de un "no hay resultados"
  // seco. null solo si no se pudo formar ninguna combinación.
  cheapestTotalCost: number | null;
  // Qué haría falta para que haya alternativas de verdad, cuando las que hay
  // no dan para tres propuestas distintas. null cuando ya hay variedad o
  // cuando ningún aumento razonable la abre.
  budgetUnlock: BudgetUnlock | null;
  providerSearches: ProviderSearchLog[];
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

function addDaysIso(dateIso: string, daysToAdd: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return toIsoDate(date);
}

// Construye el itinerario real (Fase 10) de una combinación ganadora:
// matriz de desplazamientos (hotel + actividades elegidas, vía RoutesProvider
// — Fase 12: MockRoutesProvider hoy, Google Routes el día que se sustituya)
// -> agrupación por proximidad y reparto entre días -> horario día a día ->
// validación y reparación si hace falta. Solo se llama sobre las 3
// combinaciones que selectDiverseProposals() elige al final, nunca sobre
// las decenas o cientos de candidatas evaluadas.
async function buildItineraryForCombination(
  combination: TripCombination,
  context: {
    days: number;
    departureDateIso: string;
    preferences: PreferenceProfile;
    travelLeg: (fromId: string, toId: string) => TravelMatrixEntry | undefined;
  },
): Promise<ItineraryDay[]> {
  const hotel = {
    id: combination.accommodation.id,
    name: combination.accommodation.name,
    latitude: combination.accommodation.latitude,
    longitude: combination.accommodation.longitude,
  };

  const travelLeg = context.travelLeg;
  const allocations = distributePlacesAcrossDays(combination.activities, context.days, context.preferences);
  const outboundArrival = combination.flight.outbound[combination.flight.outbound.length - 1].arrivalTime;
  const inboundDeparture = combination.flight.inbound?.[0]?.departureTime;

  const days = allocations.map((allocation) => {
    const date = addDaysIso(context.departureDateIso, allocation.dayNumber - 1);
    const isArrivalDay = allocation.dayNumber === 1;
    const isDepartureDay = allocation.dayNumber === context.days;

    return scheduleDayActivities(allocation.places, {
      dayNumber: allocation.dayNumber,
      date,
      dayOfWeek: new Date(`${date}T00:00:00.000Z`).getUTCDay(),
      isArrivalDay,
      isDepartureDay,
      arrivalTime: isArrivalDay ? outboundArrival : undefined,
      departureTime: isDepartureDay ? inboundDeparture : undefined,
      preferences: context.preferences,
      travelLeg,
      hotel,
    });
  });

  const errors = validateItinerary(days);
  return errors.length > 0 ? repairInvalidItinerary(days, errors) : days;
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

  // Paso 9: el recuento de caché se crea aquí, uno por búsqueda, y se pasa a
  // mano a los tres sitios que consultan caché. Ver cache-stats.service.ts
  // para por qué no es una variable de módulo.
  const tally = createCacheTally();

  // Paso 2: el centro real del destino se resuelve UNA vez por viaje
  // generado y se reparte a los proveedores que lo necesitan. Si cada
  // proveedor geocodificase por su cuenta, la misma ciudad se consultaría
  // dos veces por búsqueda. Va antes del Promise.all porque ambas búsquedas
  // dependen de él; los vuelos no, pero paralelizarlos por separado no
  // compensa la complejidad cuando la caché resuelve esto en milisegundos.
  const center = await resolveCityCenter(request.destination, tally);

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
      center,
      checkInDate: departureDateIso,
      checkOutDate: returnDateIso,
      adults: request.travelers.adults,
      children: request.travelers.children,
    }),
    placesProvider.searchActivities(
      {
        destination: request.destination,
        center,
        preferences,
      },
      tally,
    ),
  ]);

  const providerSearches: ProviderSearchLog[] = [
    { provider: "flights", offerCount: flights.length },
    { provider: "accommodations", offerCount: accommodations.length },
    { provider: "activities", offerCount: activities.length },
  ];

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

  // Una sola matriz de desplazamientos para TODAS las propuestas.
  //
  // combineOffers() selecciona las actividades una vez, fuera de sus bucles,
  // así que todas las combinaciones comparten exactamente la misma lista: lo
  // único que cambia entre propuestas es el hotel. Calcular la matriz dentro
  // de cada itinerario repetía tres veces el mismo trabajo, que con
  // OpenRouteService serían tres llamadas de red en lugar de una.
  //
  // Se piden los hoteles de las candidatas que pueden acabar siendo
  // propuesta, no los de las cientos de combinaciones evaluadas.
  const activityPlaces = (nonDominated[0]?.combination.activities ?? []).map((activity) => ({
    id: activity.id,
    latitude: activity.latitude,
    longitude: activity.longitude,
  }));
  // Se acotan los hoteles porque la matriz tiene un máximo de puntos y
  // nonDominated puede traer bastantes. De estos solo tres acaban siendo
  // propuesta; si alguno se quedara fuera del recorte, sus desplazamientos
  // se estiman en línea recta, que es el comportamiento de siempre.
  const MAX_HOTELS_IN_MATRIX = 20;
  const hotelPlaces = [
    ...new Map(
      nonDominated.map(({ combination }) => [
        combination.accommodation.id,
        {
          id: combination.accommodation.id,
          latitude: combination.accommodation.latitude,
          longitude: combination.accommodation.longitude,
        },
      ]),
    ).values(),
  ].slice(0, MAX_HOTELS_IN_MATRIX);

  const travelMatrix = await resolveTravelMatrix([...hotelPlaces, ...activityPlaces], tally);
  const travelLookup = buildTravelMatrixLookup(travelMatrix);
  const travelLeg = (fromId: string, toId: string) => travelLookup.get(`${fromId}->${toId}`);

  const proposals = await selectDiverseProposals(nonDominated, {
    userBudget: request.budget,
    travelers,
    preferences,
    evaluatedCombinations: combinations.length,
    discardedCombinations,
    buildItinerary: (combination) =>
      buildItineraryForCombination(combination, { days, departureDateIso, preferences, travelLeg }),
  });

  const cheapestTotalCost = combinations.length
    ? Math.round(Math.min(...combinations.map((combination) => combination.budget.totalTripCost)))
    : null;

  // Solo se calcula cuando el resultado es pobre: menos de tres propuestas, o
  // tres que comparten alojamiento. Si hay variedad no hay nada que decir, y
  // no tiene sentido gastar el cálculo en la mayoría de búsquedas, que salen
  // bien. No hace ninguna llamada de red: reutiliza las ofertas ya pedidas.
  const distinctHotels = new Set(proposals.map((proposal) => proposal.accommodation.id)).size;
  const budgetUnlock =
    distinctHotels > 1 && proposals.length >= 3
      ? null
      : analyzeBudgetUnlock(flights, accommodations, activities, {
          travelers,
          days,
          userBudget: request.budget,
          preferences,
        });

  // Se publica al final y no se espera al resultado en el camino crítico:
  // medir si la caché funciona no puede añadir latencia a la respuesta ni,
  // mucho menos, tumbarla. reportCacheTally nunca lanza.
  await reportCacheTally(tally, request.destination);

  return {
    proposals,
    evaluatedCombinations: combinations.length,
    discardedCombinations,
    cheapestTotalCost,
    budgetUnlock,
    providerSearches,
  };
}
