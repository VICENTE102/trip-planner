import type { ActivityCandidate } from "../types/activity.js";
import type { ItineraryDay, ItineraryItem } from "../types/itinerary.js";
import type { PreferenceProfile } from "../types/trip.js";
import type { ClusterablePlace } from "./cluster-places.js";
import { clusterPlacesByProximity } from "./cluster-places.js";

// Sección 12.1.
const DAY_START_MINUTES = 9 * 60; // 09:00
const NIGHTLIFE_DAY_START_MINUTES = 11 * 60; // 11:00 — "ajustar comienzo si Vida nocturna es alta"
const DEFAULT_TRANSITION_MARGIN_MINUTES = 15; // dentro del rango 10-20 min que pide la sección 12.1
const MAX_CONTINUOUS_ACTIVITY_MINUTES = 3 * 60;
const BREAK_MINUTES = 30;
export const MIN_FREE_TIME_MINUTES_PER_DAY = 60;
const LUNCH_WINDOW_START_MINUTES = 13 * 60;
const LUNCH_DURATION_MINUTES = 60;
const LUNCH_COST_PER_PERSON = 20; // estimación fija, independiente de BudgetBreakdown.foodBudget (Fase 6)
// A partir de esta hora, la primera comida del día que toque insertar ya
// no es un almuerzo tardío sino la cena (relevante sobre todo en el día de
// llegada, cuando el vuelo aterriza entrada la tarde).
const DINNER_LABEL_THRESHOLD_MINUTES = 18 * 60;
const DINNER_START_MINUTES = 20 * 60 + 30; // 20:30
const DINNER_DURATION_MINUTES = 90;
const DINNER_COST_PER_PERSON = 35;
// No hay coordenadas de aeropuerto en los mocks (Fase 5): el traslado
// aeropuerto-hotel se estima como una duración fija razonable, no una
// distancia real.
const AIRPORT_TRANSFER_MINUTES = 45;
const HOTEL_CHECKIN_MINUTES = 30;
const AIRPORT_SAFETY_BUFFER_MINUTES = 180; // margen antes del vuelo de vuelta

export const MAX_VISITS_PER_DAY = 3;
const REDUCED_MAX_VISITS_PER_DAY = 2; // "reducir intensidad si Relax o Familia es alta"
const MAX_VISITS_EDGE_DAY = 1; // llegada/salida

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToIso(dateIso: string, minutes: number): string {
  const base = new Date(`${dateIso}T00:00:00.000Z`);
  base.setUTCMinutes(base.getUTCMinutes() + minutes);
  return base.toISOString();
}

export function isoMinutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

// distributePlacesAcrossDays(): agrupa por proximidad (clusterPlacesByProximity)
// y asigna un cluster a cada día, aplicando los topes de la sección 12.1:
// máximo 3 visitas/día (2 si Relax o Familia es alta), y solo 1 en los
// días de llegada/salida. Lo que no cabe en un día de borde se reparte
// entre los días intermedios que todavía tengan hueco.
export interface DayPlaces<T> {
  dayNumber: number;
  places: T[];
}

export function distributePlacesAcrossDays<T extends ClusterablePlace>(
  places: T[],
  days: number,
  preferences: PreferenceProfile,
): DayPlaces<T>[] {
  const clusters = clusterPlacesByProximity(places, days);
  const allocations: DayPlaces<T>[] = clusters.map((clusterPlaces, index) => ({
    dayNumber: index + 1,
    places: [...clusterPlaces],
  }));

  const reducedIntensity = preferences.relax >= 2 || preferences.family >= 2;
  const middleDayCap = reducedIntensity ? REDUCED_MAX_VISITS_PER_DAY : MAX_VISITS_PER_DAY;

  const overflow: T[] = [];
  for (const allocation of allocations) {
    const isEdgeDay = allocation.dayNumber === 1 || allocation.dayNumber === days;
    const cap = isEdgeDay ? MAX_VISITS_EDGE_DAY : middleDayCap;
    if (allocation.places.length > cap) {
      overflow.push(...allocation.places.slice(cap));
      allocation.places = allocation.places.slice(0, cap);
    }
  }

  const middleDays = allocations.filter((a) => a.dayNumber !== 1 && a.dayNumber !== days);
  let cursor = 0;
  for (const place of overflow) {
    for (let attempts = 0; attempts < middleDays.length; attempts++) {
      const day = middleDays[cursor % middleDays.length];
      cursor++;
      if (day.places.length < middleDayCap) {
        day.places.push(place);
        break;
      }
    }
    // si ningún día intermedio tiene hueco, la actividad no entra en el itinerario final
  }

  return allocations;
}

export function calculateNextStartTime(
  previousEndMinutes: number,
  travelMinutes: number,
  marginMinutes: number = DEFAULT_TRANSITION_MARGIN_MINUTES,
): number {
  return previousEndMinutes + travelMinutes + marginMinutes;
}

export function checkOpeningHours(place: ActivityCandidate, dayOfWeek: number, minutesFromMidnight: number): boolean {
  if (!place.openingHours || place.openingHours.length === 0) {
    // Sin datos de horario: no se puede afirmar que está cerrado, así que
    // no se descarta (queda igualmente marcado "unverified" en el ítem).
    return true;
  }
  const period = place.openingHours.find((p) => p.dayOfWeek === dayOfWeek);
  if (!period) return false;
  const opensAt = parseTimeToMinutes(period.opensAt);
  const closesAt = parseTimeToMinutes(period.closesAt);
  return minutesFromMidnight >= opensAt && minutesFromMidnight < closesAt;
}

function nextOpeningMinutes(place: ActivityCandidate, dayOfWeek: number, afterMinutes: number): number | null {
  if (!place.openingHours || place.openingHours.length === 0) return afterMinutes;
  const period = place.openingHours.find((p) => p.dayOfWeek === dayOfWeek);
  if (!period) return null;
  const opensAt = parseTimeToMinutes(period.opensAt);
  const closesAt = parseTimeToMinutes(period.closesAt);
  if (afterMinutes < opensAt) return opensAt;
  if (afterMinutes < closesAt) return afterMinutes;
  return null; // ya cerró por hoy
}

export function calculateDailyBudget(items: ItineraryItem[]): number {
  return round2(items.reduce((sum, item) => sum + (item.costPerPerson ?? 0), 0));
}

export interface ScheduleDayContext {
  dayNumber: number;
  date: string; // ISO date (YYYY-MM-DD)
  dayOfWeek: number; // 0 (domingo) - 6 (sábado)
  isArrivalDay: boolean;
  isDepartureDay: boolean;
  arrivalTime?: string; // ISO datetime del vuelo de ida, solo día de llegada
  departureTime?: string; // ISO datetime del vuelo de vuelta, solo día de salida
  preferences: PreferenceProfile;
  travelMinutes: (fromId: string, toId: string) => number;
  hotel: { id: string; name: string };
}

// scheduleDayActivities(): construye la secuencia de ItineraryItem de un
// día completo (llegada/traslados/visitas/comidas/tiempo libre),
// respetando las reglas de la sección 12.1. Es un algoritmo voraz
// (procesa los lugares en el orden ya agrupado por proximidad), no un
// optimizador de rutas — suficiente para datos simulados.
export function scheduleDayActivities(places: ActivityCandidate[], context: ScheduleDayContext): ItineraryDay {
  const items: ItineraryItem[] = [];
  let itemIndex = 0;
  const nextId = () => `item-${context.dayNumber}-${itemIndex++}`;

  function pushItem(partial: Omit<ItineraryItem, "id" | "startTime" | "endTime"> & { startMinutes: number }) {
    const { startMinutes, ...rest } = partial;
    items.push({
      id: nextId(),
      startTime: minutesToIso(context.date, startMinutes),
      endTime: minutesToIso(context.date, startMinutes + partial.durationMinutes),
      ...rest,
    });
  }

  let lastPlaceId = context.hotel.id;
  let continuousMinutes = 0;
  let freeTimeMinutes = 0;
  let lunchScheduled = false;
  let dinnerScheduled = false;
  let cursor: number;

  if (context.isArrivalDay && context.arrivalTime) {
    // Sección 12.1: "primer día adaptado a la hora real de llegada".
    cursor = isoMinutesOfDay(context.arrivalTime);
    pushItem({
      type: "arrival",
      title: "Llegada y traslado al alojamiento",
      durationMinutes: AIRPORT_TRANSFER_MINUTES,
      startMinutes: cursor,
      transportMode: "transit",
      verificationStatus: "unverified",
    });
    cursor += AIRPORT_TRANSFER_MINUTES;

    pushItem({
      type: "hotel",
      title: `Registro en ${context.hotel.name}`,
      durationMinutes: HOTEL_CHECKIN_MINUTES,
      startMinutes: cursor,
      verificationStatus: "unverified",
    });
    cursor += HOTEL_CHECKIN_MINUTES;
    lastPlaceId = context.hotel.id;
  } else {
    cursor = context.preferences.nightlife >= 2 ? NIGHTLIFE_DAY_START_MINUTES : DAY_START_MINUTES;
  }

  // Sección 12.1: "último día con margen suficiente para el traslado" —
  // nada puede terminar más tarde de este límite en el día de salida.
  const dayEndCutoff =
    context.isDepartureDay && context.departureTime
      ? isoMinutesOfDay(context.departureTime) - AIRPORT_SAFETY_BUFFER_MINUTES - AIRPORT_TRANSFER_MINUTES
      : 24 * 60;

  // Se comprueba tanto antes del bucle como en cada iteración: un día sin
  // ninguna visita (posible en los de llegada/salida, o si no hay
  // actividades que quepan) nunca entraría al bucle, y aun así la comida
  // debe añadirse igualmente si el cursor ya está en esa franja horaria.
  function maybeScheduleLunch() {
    if (lunchScheduled || cursor < LUNCH_WINDOW_START_MINUTES) return;
    // Si el cursor ya ha entrado en la franja de comida, se inserta la
    // primera comida del día — pero si por una llegada tardía ya es la
    // hora de cenar, se etiqueta y cuenta como cena, no como un almuerzo
    // fuera de hora.
    const isActuallyDinner = cursor >= DINNER_LABEL_THRESHOLD_MINUTES;
    const mealStart = cursor;
    const mealDuration = isActuallyDinner ? DINNER_DURATION_MINUTES : LUNCH_DURATION_MINUTES;
    if (mealStart + mealDuration > dayEndCutoff) {
      // No cabe antes del margen de traslado al aeropuerto (día de salida
      // con vuelo temprano): coger el vuelo tiene prioridad sobre la
      // comida, no se fuerza su inserción.
      return;
    }
    pushItem({
      type: "meal",
      title: isActuallyDinner ? "Cena" : "Comida",
      durationMinutes: isActuallyDinner ? DINNER_DURATION_MINUTES : LUNCH_DURATION_MINUTES,
      startMinutes: mealStart,
      costPerPerson: isActuallyDinner ? DINNER_COST_PER_PERSON : LUNCH_COST_PER_PERSON,
      verificationStatus: "unverified",
    });
    cursor = mealStart + (isActuallyDinner ? DINNER_DURATION_MINUTES : LUNCH_DURATION_MINUTES);
    lunchScheduled = true;
    if (isActuallyDinner) dinnerScheduled = true;
    continuousMinutes = 0;
  }

  maybeScheduleLunch();

  for (const place of places) {
    maybeScheduleLunch();

    const travelMinutes = lastPlaceId === place.id ? 0 : context.travelMinutes(lastPlaceId, place.id);
    let startMinutes = calculateNextStartTime(cursor, travelMinutes);
    // Inicio real del desplazamiento (no derivado por resta de startMinutes
    // más abajo): así, si el horario de apertura o la pausa desplazan
    // startMinutes, el ítem de viaje se mueve con él en vez de quedarse
    // calculado sobre una base ya obsoleta y solaparse con la pausa.
    let travelStartMinutes = cursor;

    if (!checkOpeningHours(place, context.dayOfWeek, startMinutes)) {
      const opensAt = nextOpeningMinutes(place, context.dayOfWeek, startMinutes);
      if (opensAt === null) {
        continue; // cerrado el resto del día: no se programa fuera de horario (sección 12.1)
      }
      startMinutes = opensAt;
      // Con espera de por medio, el desplazamiento se hace justo antes de
      // la visita en vez de justo al terminar la anterior.
      travelStartMinutes = startMinutes - travelMinutes - DEFAULT_TRANSITION_MARGIN_MINUTES;
    }

    if (startMinutes + place.estimatedDurationMinutes > dayEndCutoff) {
      continue; // no cabe antes del margen de traslado al aeropuerto
    }

    if (continuousMinutes + place.estimatedDurationMinutes > MAX_CONTINUOUS_ACTIVITY_MINUTES) {
      pushItem({
        type: "free_time",
        title: "Pausa",
        durationMinutes: BREAK_MINUTES,
        startMinutes: travelStartMinutes,
        verificationStatus: "unverified",
      });
      travelStartMinutes += BREAK_MINUTES;
      startMinutes += BREAK_MINUTES;
      freeTimeMinutes += BREAK_MINUTES;
      continuousMinutes = 0;
    }

    if (travelMinutes > 0) {
      pushItem({
        type: "walk",
        title: "Desplazamiento",
        durationMinutes: travelMinutes,
        startMinutes: travelStartMinutes,
        travelMinutesFromPrevious: travelMinutes,
        verificationStatus: "unverified",
      });
    }

    pushItem({
      type: "visit",
      title: place.name,
      placeId: place.id,
      latitude: place.latitude,
      longitude: place.longitude,
      durationMinutes: place.estimatedDurationMinutes,
      travelMinutesFromPrevious: travelMinutes,
      costPerPerson: place.pricePerPerson,
      bookingRequired: place.bookingRequired,
      bookingUrl: place.bookingUrl,
      startMinutes,
      verificationStatus: place.verificationStatus,
    });

    cursor = startMinutes + place.estimatedDurationMinutes;
    continuousMinutes += place.estimatedDurationMinutes;
    lastPlaceId = place.id;
  }

  // Red de seguridad: si el día no tuvo ninguna visita que hiciera avanzar
  // el cursor hasta la franja de comida (día sin lugares asignados, o
  // todos descartados por horario), se fuerza igualmente para no llegar a
  // la cena sin haber comido — "añadir comida y cena automáticamente"
  // (sección 12.1) no es condicional a que haya actividades ese día.
  if (!lunchScheduled) {
    const forcedStart = Math.max(cursor, LUNCH_WINDOW_START_MINUTES);
    // Solo se adelanta el cursor si la comida realmente va a caber; si no,
    // se deja el cursor tal cual para no descuadrar la cena/el traslado
    // que vienen después.
    if (forcedStart + LUNCH_DURATION_MINUTES <= dayEndCutoff) {
      cursor = forcedStart;
      maybeScheduleLunch();
    }
  }

  const dinnerStart = Math.max(cursor + DEFAULT_TRANSITION_MARGIN_MINUTES, DINNER_START_MINUTES);
  if (!dinnerScheduled && dinnerStart + DINNER_DURATION_MINUTES <= dayEndCutoff) {
    pushItem({
      type: "meal",
      title: "Cena",
      durationMinutes: DINNER_DURATION_MINUTES,
      startMinutes: dinnerStart,
      costPerPerson: DINNER_COST_PER_PERSON,
      verificationStatus: "unverified",
    });
    cursor = dinnerStart + DINNER_DURATION_MINUTES;
  }

  if (freeTimeMinutes < MIN_FREE_TIME_MINUTES_PER_DAY) {
    // Igual que con la comida forzada: no se añade más de lo que quepa
    // antes del margen de traslado (día de salida con vuelo muy temprano
    // puede legítimamente quedarse por debajo del mínimo).
    const extra = Math.min(MIN_FREE_TIME_MINUTES_PER_DAY - freeTimeMinutes, Math.max(0, dayEndCutoff - cursor));
    if (extra > 0) {
      pushItem({
        type: "free_time",
        title: "Tiempo libre",
        durationMinutes: extra,
        startMinutes: cursor,
        verificationStatus: "unverified",
      });
      cursor += extra;
    }
  }

  if (context.isDepartureDay && context.departureTime) {
    // El traslado va anclado a la hora real del vuelo, no al cursor: es un
    // límite externo que no se puede negociar. Si algo anterior hubiera
    // invadido este hueco sería un fallo de esa inserción (todas
    // respetan dayEndCutoff), no algo que arreglar retrasando el traslado.
    const idealStart = isoMinutesOfDay(context.departureTime) - AIRPORT_SAFETY_BUFFER_MINUTES - AIRPORT_TRANSFER_MINUTES;
    pushItem({
      type: "transfer",
      title: "Traslado al aeropuerto",
      durationMinutes: AIRPORT_TRANSFER_MINUTES,
      startMinutes: idealStart,
      transportMode: "transit",
      verificationStatus: "unverified",
    });
  }

  return { dayNumber: context.dayNumber, date: context.date, items };
}
