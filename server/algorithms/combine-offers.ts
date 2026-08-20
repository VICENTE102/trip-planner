import type { AccommodationOffer } from "../types/accommodation.js";
import type { ActivityCandidate } from "../types/activity.js";
import type { FlightOffer } from "../types/flight.js";
import type {
  BudgetBreakdown,
  PreferenceLevel,
  PreferenceProfile,
  ScoreBreakdown,
  TripCombination,
} from "../types/trip.js";
import { ALL_PREFERENCES } from "../utils/preferences.js";
import { haversineDistanceKm } from "../utils/geo.js";
import { allocateBudget } from "./allocate-budget.js";
import { normalizeScore } from "./normalize-score.js";
import { calculatePreferenceScore } from "./score-preferences.js";
import { scoreAccommodation } from "./score-accommodation.js";
import { scoreFlight } from "./score-flight.js";

// Fase 9 (sección 6.1): cómo influyen las preferencias en el plan, con lo
// que ya es honesto implementar sin un itinerario real todavía.
//
// - Gastronomía alta -> más presupuesto de comidas: implementado abajo
//   (applyGastronomyBudgetBoost), ajusta foodBudget tras allocateBudget().
// - Cultura/Naturaleza/Compras/Playa altas -> más peso a las actividades
//   de esa temática (museos/patrimonio, parques/excursiones, mercados,
//   actividades acuáticas): ya lo hace selectTopActivities() de más abajo,
//   ordenando por calculatePreferenceScore() contra el profile de cada
//   ActivityCandidate — los templates de la Fase 5 ya codifican esas
//   mismas asociaciones temáticas. Se deja documentado aquí para que la
//   conexión con la sección 6.1 sea explícita, no implícita.
// - Partes de esas mismas preferencias que SÍ requieren un itinerario real
//   quedan pendientes de la Fase 10: "hoteles cercanos al litoral" y "días
//   de descanso" (playa), "mayor peso de accesibilidad a monumentos"
//   (cultura), "menor concentración urbana" (naturaleza) y "tiempo
//   reservado" (compras) son todo señales de ritmo/logística de
//   itinerario, no de selección de actividades.
// - Familia alta, Relax alto y Vida nocturna alta son en su totalidad
//   reglas de ritmo/horario del itinerario (menos traslados, máx. 2
//   visitas, comienzo/final más tarde...) — no se implementan todavía por
//   la misma razón, no hay ItineraryDay/ItineraryItem con el que
//   trabajar. Se retoman en la Fase 10.

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

// Sección 6.1 (Fase 9): "cultura alta -> mayor peso de patrimonio y
// museos", "naturaleza alta -> excursiones, parques y zonas verdes",
// "compras alta -> mercados y zonas comerciales", "playa alta -> favorecer
// litoral y actividades acuáticas". calculatePreferenceScore() aplica las
// cuatro reglas a la vez: una actividad de categoría "playa" solo sube en
// el ranking si el usuario puso beach > 0, y sube más cuanto mayor sea ese
// nivel.
//
// La afinidad se calcula UNA vez para todo el fondo de actividades, no por
// combinación. Depende solo de las preferencias del usuario, que no cambian
// entre combinaciones: recalcularla 285 veces daría 285 veces el mismo
// número. Antes se calculaba además dentro del comparador de un sort, o sea
// dos veces por comparación.
interface RankedActivity {
  activity: ActivityCandidate;
  affinity: number;
}

export function rankActivitiesByAffinity(
  activities: ActivityCandidate[],
  preferences: PreferenceProfile,
): RankedActivity[] {
  return activities
    .map((activity) => ({ activity, affinity: calculatePreferenceScore(preferences, activity.profile) }))
    .sort((a, b) => b.affinity - a.affinity);
}

// Cuánto puede penalizar la lejanía al hotel, en puntos sobre los 100 de la
// escala de afinidad, y a partir de qué distancia se aplica el máximo.
const PROXIMITY_PENALTY = 30;
const PROXIMITY_CAP_KM = 8;

// Lo que hace que dos propuestas tengan itinerarios distintos: cada
// combinación elige sus actividades según DÓNDE ESTÁ SU HOTEL. No es
// variación por variar — si te alojas en Trastevere, tus planes deberían
// estar en Trastevere y no al otro lado del Tíber. Encaja además con
// distributePlacesAcrossDays(), que agrupa por proximidad: los días salen
// más compactos y con menos desplazamiento.
//
// Es una pasada O(N) sobre el fondo ya ordenado, más un sort de números ya
// calculados. Nada de recalcular afinidades.
function selectActivitiesForHotel(
  ranked: RankedActivity[],
  preferences: PreferenceProfile,
  days: number,
  hotel: { latitude: number; longitude: number },
): ActivityCandidate[] {
  const count = Math.min(ranked.length, Math.max(MIN_ACTIVITIES_PER_COMBINATION, days * ACTIVITIES_PER_DAY));

  const byProximity = ranked
    .map((entry) => {
      const distanceKm = haversineDistanceKm(
        hotel.latitude,
        hotel.longitude,
        entry.activity.latitude,
        entry.activity.longitude,
      );
      const penalty = (Math.min(distanceKm, PROXIMITY_CAP_KM) / PROXIMITY_CAP_KM) * PROXIMITY_PENALTY;
      return { ...entry, score: entry.affinity - penalty };
    })
    .sort((a, b) => b.score - a.score);

  const wanted = ALL_PREFERENCES.filter((key) => preferences[key] > 0);
  const totalWeight = wanted.reduce((sum, key) => sum + preferences[key], 0);
  if (totalWeight === 0) {
    return byProximity.slice(0, count).map((entry) => entry.activity);
  }

  const selected: ActivityCandidate[] = [];
  const taken = new Set<string>();

  // El reparto por cupos es lo que impide que una sola categoría se coma el
  // itinerario cuando hay candidatas de sobra: Roma tiene catorce
  // actividades de cultura pura, y quien pidiera cultura 3 y gastronomía 2
  // se llevaba diez museos y cero gastronomía.
  //
  // De más peso a menos: si al redondear los cupos sobran plazas, se las
  // queda lo que el usuario ha pedido con más fuerza.
  for (const key of [...wanted].sort((a, b) => preferences[b] - preferences[a])) {
    const quota = Math.max(1, Math.round((count * preferences[key]) / totalWeight));
    let used = 0;
    for (const entry of byProximity) {
      if (used >= quota || selected.length >= count) break;
      if (taken.has(entry.activity.id) || entry.activity.profile[key] === 0) continue;
      taken.add(entry.activity.id);
      selected.push(entry.activity);
      used++;
    }
  }

  for (const entry of byProximity) {
    if (selected.length >= count) break;
    if (taken.has(entry.activity.id)) continue;
    taken.add(entry.activity.id);
    selected.push(entry.activity);
  }

  return selected;
}

// Sección 6.1: "gastronomía alta -> reservar mayor presupuesto de
// comidas". El documento no da una fórmula exacta; se aplica un recargo
// orientativo sobre el foodBudget ya calculado por allocateBudget(),
// proporcional al nivel de preferencia (0-3), y se recalcula
// totalTripCost en consecuencia. Con nivel 0 o 1 no se toca nada.
const GASTRONOMY_FOOD_BUDGET_BOOST: Record<PreferenceLevel, number> = {
  0: 0,
  1: 0,
  2: 0.2,
  3: 0.4,
};

export function applyGastronomyBudgetBoost(budget: BudgetBreakdown, preferences: PreferenceProfile): BudgetBreakdown {
  const boost = GASTRONOMY_FOOD_BUDGET_BOOST[preferences.gastronomy];
  if (boost === 0) {
    return budget;
  }

  const foodBudget = round2(budget.foodBudget * (1 + boost));
  const totalTripCost = round2(budget.totalTripCost - budget.foodBudget + foodBudget);

  return { ...budget, foodBudget, totalTripCost };
}

// Sección 21 (Fase 8), pasos 1-3: combina vuelos y alojamientos, calcula
// el coste base y reserva comidas/transporte local/actividades/imprevistos
// vía allocateBudget() (Fase 6) para cada combinación resultante, ya
// ajustado por preferencias (Fase 9).
export function combineOffers(
  flights: FlightOffer[],
  accommodations: AccommodationOffer[],
  activities: ActivityCandidate[],
  context: CombineOffersContext,
): TripCombination[] {
  const ranked = rankActivitiesByAffinity(activities, context.preferences);

  // Las actividades se eligen por hotel, así que el coste también cambia por
  // combinación. Se memoriza por hotel: el mismo alojamiento aparece en
  // tantas combinaciones como vuelos haya (unos 15), y su selección es la
  // misma en todas.
  const byHotel = new Map<string, { activities: ActivityCandidate[]; cost: number }>();
  const selectionFor = (accommodation: AccommodationOffer) => {
    const cached = byHotel.get(accommodation.id);
    if (cached) return cached;

    const selectedActivities = selectActivitiesForHotel(ranked, context.preferences, context.days, accommodation);
    const cost = round2(
      selectedActivities.reduce((sum, activity) => sum + (activity.pricePerPerson ?? 0), 0) * context.travelers,
    );
    const entry = { activities: selectedActivities, cost };
    byHotel.set(accommodation.id, entry);
    return entry;
  };

  const combinations: TripCombination[] = [];
  for (const flight of flights) {
    for (const accommodation of accommodations) {
      const { activities: selectedActivities, cost: activityCost } = selectionFor(accommodation);
      const baseBudget = allocateBudget({
        userBudget: context.userBudget,
        travelers: context.travelers,
        days: context.days,
        mainTransportCost: flight.totalPrice,
        accommodationCost: accommodation.totalPrice,
        activityCost,
      });
      const budget = applyGastronomyBudgetBoost(baseBudget, context.preferences);

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
