import type { ItineraryDay, ItineraryItem } from "../types/itinerary.js";
import type { ScoreBreakdown, TripCombination, ValidationError } from "../types/trip.js";
import { isWithinBudget } from "./allocate-budget.js";
import { meetsMinimumScores } from "./calculate-trip-score.js";
import { isoMinutesOfDay, MAX_VISITS_PER_DAY, MIN_FREE_TIME_MINUTES_PER_DAY, minutesToIso } from "./schedule-itinerary.js";

export interface ValidateCombinationContext {
  userBudget: number;
  travelers: number;
}

export interface CombinationValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Sección 10.1: subconjunto de restricciones duras que ya se pueden
// comprobar con los datos disponibles en esta fase. "Fechas compatibles"
// no se valida aquí porque los mocks siempre se generan para las fechas
// exactas solicitadas (sección 5); "sin solapamientos"/"fuera de horario"
// llegan con el itinerario real (Fase 10); y "restricciones de movilidad"
// no tiene todavía ningún dato de accesibilidad en los mocks con el que
// contrastarse, así que no se puede comprobar de forma honesta aún.
export function validateCombination(
  combination: TripCombination,
  context: ValidateCombinationContext,
): CombinationValidationResult {
  const errors: ValidationError[] = [];

  if (!isWithinBudget(combination.budget, context.userBudget)) {
    errors.push({
      code: "OVER_BUDGET",
      message: "El coste total de la combinación supera el presupuesto disponible.",
      path: "budget.totalTripCost",
    });
  }

  if (combination.accommodation.capacity < context.travelers) {
    errors.push({
      code: "INSUFFICIENT_CAPACITY",
      message: "El alojamiento no tiene capacidad para todos los viajeros.",
      path: "accommodation.capacity",
    });
  }

  // foodBudget/localTransportCost/emergencyReserve ya vienen garantizados
  // > 0 por los mínimos de allocateBudget(); se comprueban aquí de forma
  // explícita porque son restricciones duras propias del documento
  // (sección 10.1), no un efecto colateral incidental de otra función.
  if (combination.budget.foodBudget <= 0) {
    errors.push({
      code: "NO_FOOD_BUDGET",
      message: "No se ha reservado un presupuesto mínimo de comidas.",
      path: "budget.foodBudget",
    });
  }

  if (combination.budget.localTransportCost <= 0) {
    errors.push({
      code: "NO_LOCAL_TRANSPORT",
      message: "No se ha reservado transporte local.",
      path: "budget.localTransportCost",
    });
  }

  if (combination.budget.emergencyReserve <= 0) {
    errors.push({
      code: "NO_EMERGENCY_RESERVE",
      message: "No se ha reservado la reserva de emergencia mínima.",
      path: "budget.emergencyReserve",
    });
  }

  return { valid: errors.length === 0, errors };
}

// Sección 10.4: además de las restricciones duras anteriores, una
// combinación se descarta si algún criterio esencial de puntuación queda
// por debajo de su umbral mínimo, aunque la media global sea buena.
export function passesQualityThresholds(scoreBreakdown: ScoreBreakdown): boolean {
  return meetsMinimumScores(scoreBreakdown).passes;
}

// detectOverlaps() (Fase 10, sección 12.3): por construcción,
// scheduleDayActivities() ya avanza el cursor de forma estrictamente
// secuencial, así que no debería producir solapamientos — esta función es
// la red de seguridad post-hoc que exige el documento, independiente de
// cómo se haya construido el día.
export function detectOverlaps(items: ItineraryItem[]): Array<[ItineraryItem, ItineraryItem]> {
  const sorted = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const overlaps: Array<[ItineraryItem, ItineraryItem]> = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (new Date(current.endTime).getTime() > new Date(next.startTime).getTime()) {
      overlaps.push([current, next]);
    }
  }

  return overlaps;
}

function dayPath(dayNumber: number): string {
  return `itinerary.day${dayNumber}`;
}

// validateItinerary() (sección 12.3): comprueba las reglas de la sección
// 12.1 que aplican al itinerario ya construido — solapamientos, tiempo
// libre mínimo y máximo de visitas por día. Los horarios de apertura y el
// límite de 3 horas continuas ya se aplican durante la construcción
// (scheduleDayActivities), así que no hace falta re-derivarlos aquí.
export function validateItinerary(days: ItineraryDay[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const day of days) {
    for (const [a, b] of detectOverlaps(day.items)) {
      errors.push({
        code: "ITINERARY_OVERLAP",
        message: `"${a.title}" y "${b.title}" se solapan en el día ${day.dayNumber}.`,
        path: dayPath(day.dayNumber),
      });
    }

    const freeTimeMinutes = day.items
      .filter((item) => item.type === "free_time")
      .reduce((sum, item) => sum + item.durationMinutes, 0);
    if (freeTimeMinutes < MIN_FREE_TIME_MINUTES_PER_DAY) {
      errors.push({
        code: "INSUFFICIENT_FREE_TIME",
        message: `El día ${day.dayNumber} no llega al mínimo de ${MIN_FREE_TIME_MINUTES_PER_DAY} minutos de tiempo libre.`,
        path: dayPath(day.dayNumber),
      });
    }

    const visitCount = day.items.filter((item) => item.type === "visit").length;
    if (visitCount > MAX_VISITS_PER_DAY) {
      errors.push({
        code: "TOO_MANY_VISITS",
        message: `El día ${day.dayNumber} programa más de ${MAX_VISITS_PER_DAY} visitas principales.`,
        path: dayPath(day.dayNumber),
      });
    }
  }

  return errors;
}

function repairOverlaps(items: ItineraryItem[], date: string): ItineraryItem[] {
  const sorted = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (new Date(current.startTime).getTime() < new Date(previous.endTime).getTime()) {
      const shiftedStart = isoMinutesOfDay(previous.endTime);
      sorted[i] = {
        ...current,
        startTime: minutesToIso(date, shiftedStart),
        endTime: minutesToIso(date, shiftedStart + current.durationMinutes),
      };
    }
  }

  return sorted;
}

// repairInvalidItinerary() (sección 12.3): repara lo que honestamente se
// puede reparar de forma automática y determinista — desplazar elementos
// solapados y añadir el tiempo libre que falte. No intenta "inventar" una
// visita nueva ni recolocar una actividad entera fuera de su cluster de
// proximidad; eso reabriría decisiones que ya tomaron
// distributePlacesAcrossDays()/scheduleDayActivities().
export function repairInvalidItinerary(days: ItineraryDay[], errors: ValidationError[]): ItineraryDay[] {
  return days.map((day) => {
    const dayErrors = errors.filter((error) => error.path === dayPath(day.dayNumber));
    if (dayErrors.length === 0) {
      return day;
    }

    let items = day.items;

    if (dayErrors.some((error) => error.code === "ITINERARY_OVERLAP")) {
      items = repairOverlaps(items, day.date);
    }

    if (dayErrors.some((error) => error.code === "INSUFFICIENT_FREE_TIME")) {
      const freeTimeMinutes = items
        .filter((item) => item.type === "free_time")
        .reduce((sum, item) => sum + item.durationMinutes, 0);
      const missing = MIN_FREE_TIME_MINUTES_PER_DAY - freeTimeMinutes;

      if (missing > 0) {
        const lastItem = items[items.length - 1];
        const startMinutes = lastItem ? isoMinutesOfDay(lastItem.endTime) : 0;
        items = [
          ...items,
          {
            id: `item-${day.dayNumber}-repair-free-time`,
            type: "free_time",
            title: "Tiempo libre",
            durationMinutes: missing,
            startTime: minutesToIso(day.date, startMinutes),
            endTime: minutesToIso(day.date, startMinutes + missing),
            verificationStatus: "unverified",
          },
        ];
      }
    }

    return { ...day, items };
  });
}
