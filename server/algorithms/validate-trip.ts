import type { ScoreBreakdown, TripCombination, ValidationError } from "../types/trip.js";
import { isWithinBudget } from "./allocate-budget.js";
import { meetsMinimumScores } from "./calculate-trip-score.js";

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
