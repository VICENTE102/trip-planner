import type { AccommodationOffer } from "../types/accommodation.js";
import type { ActivityCandidate } from "../types/activity.js";
import type { FlightOffer } from "../types/flight.js";
import type { PreferenceLevel, PreferenceProfile, ScoreBreakdown, TravelPreference, TripCombination } from "../types/trip.js";
import { allocateBudget } from "./allocate-budget.js";
import { normalizeScore } from "./normalize-score.js";
import { calculatePreferenceScore } from "./score-preferences.js";
import { scoreAccommodation } from "./score-accommodation.js";
import { scoreFlight } from "./score-flight.js";

export interface CombineOffersContext {
  travelers: number;
  days: number;
  userBudget: number;
  preferences: PreferenceProfile;
}

const ACTIVITIES_PER_DAY = 2;
const MIN_ACTIVITIES_PER_COMBINATION = 3;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// No hay todavía un planificador de itinerario real (Fase 10): mientras
// tanto, cada combinación se queda con las actividades más afines a las
// preferencias del usuario (aprox. 2 por día), suficientes para estimar
// activityCost y la afinidad de preferencias de la combinación.
function selectTopActivities(
  activities: ActivityCandidate[],
  preferences: PreferenceProfile,
  days: number,
): ActivityCandidate[] {
  const count = Math.min(activities.length, Math.max(MIN_ACTIVITIES_PER_COMBINATION, days * ACTIVITIES_PER_DAY));
  return [...activities]
    .sort((a, b) => calculatePreferenceScore(preferences, b.profile) - calculatePreferenceScore(preferences, a.profile))
    .slice(0, count);
}

// Sección 21 (Fase 8), pasos 1-3: combina vuelos y alojamientos, calcula
// el coste base y reserva comidas/transporte local/actividades/imprevistos
// vía allocateBudget() (Fase 6) para cada combinación resultante.
export function combineOffers(
  flights: FlightOffer[],
  accommodations: AccommodationOffer[],
  activities: ActivityCandidate[],
  context: CombineOffersContext,
): TripCombination[] {
  const selectedActivities = selectTopActivities(activities, context.preferences, context.days);
  const activityCost = round2(
    selectedActivities.reduce((sum, activity) => sum + (activity.pricePerPerson ?? 0), 0) * context.travelers,
  );

  const combinations: TripCombination[] = [];
  for (const flight of flights) {
    for (const accommodation of accommodations) {
      const budget = allocateBudget({
        userBudget: context.userBudget,
        travelers: context.travelers,
        days: context.days,
        mainTransportCost: flight.totalPrice,
        accommodationCost: accommodation.totalPrice,
        activityCost,
      });

      combinations.push({
        id: `combo-${flight.id}-${accommodation.id}`,
        flight,
        accommodation,
        activities: selectedActivities,
        budget,
      });
    }
  }

  return combinations;
}

const ALL_PREFERENCES: TravelPreference[] = [
  "beach",
  "culture",
  "gastronomy",
  "nightlife",
  "nature",
  "shopping",
  "family",
  "relax",
];

// El "perfil de afinidad" de una combinación no es el de una sola
// actividad: para cada preferencia, se toma el mejor valor que ofrece
// cualquiera de sus actividades seleccionadas (lo mejor que este viaje
// puede dar en esa preferencia, no el promedio).
function aggregateActivityProfile(activities: ActivityCandidate[]): PreferenceProfile {
  const profile = {} as PreferenceProfile;
  for (const key of ALL_PREFERENCES) {
    const maxLevel = activities.length === 0 ? 0 : Math.max(...activities.map((activity) => activity.profile[key]));
    profile[key] = maxLevel as PreferenceLevel;
  }
  return profile;
}

export interface ScoreBreakdownContext {
  allCombinations: TripCombination[];
  allFlights: FlightOffer[];
  allAccommodations: AccommodationOffer[];
  travelers: number;
  preferences: PreferenceProfile;
}

// Traduce una TripCombination a los 6 criterios de la sección 10.2:
// - price: coste total real de la combinación frente al resto de
//   combinaciones evaluadas (no el precio del vuelo o el alojamiento por
//   separado, que ya tienen su propio peso interno en sus scores).
// - accommodationQuality / location: reutilizan scoreAccommodation() —
//   "location" es su sub-criterio de distancia al centro, expuesto también
//   como criterio propio a nivel de viaje.
// - transportComfort: reutiliza scoreFlight() completo.
// - usableTime: aproximado por la duración total de vuelo (menos tiempo
//   viajando = más tiempo aprovechable en destino). Se afinará cuando
//   exista un itinerario real (Fase 10).
// - preferenceMatch: calculatePreferenceScore() contra el perfil agregado
//   de las actividades seleccionadas para esta combinación.
export function buildScoreBreakdown(combination: TripCombination, context: ScoreBreakdownContext): ScoreBreakdown {
  const totalCosts = context.allCombinations.map((c) => c.budget.totalTripCost);
  const price = normalizeScore(
    combination.budget.totalTripCost,
    Math.min(...totalCosts),
    Math.max(...totalCosts),
    "lowerIsBetter",
  );

  const accommodationResult = scoreAccommodation(combination.accommodation, context.allAccommodations, context.travelers);
  const transportComfort = scoreFlight(combination.flight, context.allFlights).score;

  const durations = context.allFlights.map((flight) => flight.totalDurationMinutes);
  const usableTime = normalizeScore(
    combination.flight.totalDurationMinutes,
    Math.min(...durations),
    Math.max(...durations),
    "lowerIsBetter",
  );

  const preferenceMatch = calculatePreferenceScore(context.preferences, aggregateActivityProfile(combination.activities));

  return {
    price,
    accommodationQuality: accommodationResult.score,
    location: accommodationResult.breakdown.location,
    transportComfort,
    usableTime,
    preferenceMatch,
  };
}
