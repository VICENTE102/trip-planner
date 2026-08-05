import type { BudgetBreakdown } from "../types/trip.js";

// Sección 9: distribución inicial orientativa. Son puntos de partida, no
// porcentajes rígidos — el motor los ajusta según los costes reales de
// vuelo/alojamiento y aplica mínimos garantizados donde el documento lo
// exige (comidas, transporte local).
const ORIENTATIVE_SHARE = {
  mainTransport: 0.3,
  accommodation: 0.35,
  food: 0.15,
  activities: 0.1,
  localTransport: 0.05,
  emergencyReserve: 0.05,
};

// Mínimos diarios por persona: se aplican cuando el % orientativo se
// queda corto (sección 9.1, "reservar un mínimo diario para comidas").
// El de transporte local cubre también los traslados aeropuerto-estación-
// hotel que la sección 9.1 pide incluir siempre.
const MIN_DAILY_FOOD_PER_PERSON = 15;
const MIN_DAILY_LOCAL_TRANSPORT_PER_PERSON = 4;

// Todavía no hay proveedor real de seguros de viaje (fuera del alcance de
// esta fase): se reserva una estimación fija por viajero hasta que se
// integre uno.
const INSURANCE_ESTIMATE_PER_PERSON = 12;

export interface AllocateBudgetInput {
  userBudget: number;
  travelers: number;
  days: number;
  /** Coste real total de ida y vuelta para todos los viajeros. */
  mainTransportCost: number;
  /** Coste real total del alojamiento para toda la estancia. */
  accommodationCost: number;
  /** Coste real de las actividades ya seleccionadas. Si aún no se conoce
   * (por ejemplo, antes de elegir actividades), se usa el % orientativo
   * sobre el presupuesto del usuario como estimación de partida. */
  activityCost?: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function allocateBudget(input: AllocateBudgetInput): BudgetBreakdown {
  const travelers = Math.max(1, input.travelers);
  const days = Math.max(1, input.days);

  // Sección 9: "Reservar primero un margen de seguridad" — se calcula
  // sobre el presupuesto del usuario, no sobre el coste acumulado, para
  // poder reservarlo antes de conocer el resto de partidas.
  const emergencyReserve = round2(input.userBudget * ORIENTATIVE_SHARE.emergencyReserve);

  const mainTransportCost = round2(input.mainTransportCost);
  const accommodationCost = round2(input.accommodationCost);

  const foodBudget = round2(
    Math.max(MIN_DAILY_FOOD_PER_PERSON * days * travelers, input.userBudget * ORIENTATIVE_SHARE.food),
  );

  const localTransportCost = round2(
    Math.max(
      MIN_DAILY_LOCAL_TRANSPORT_PER_PERSON * days * travelers,
      input.userBudget * ORIENTATIVE_SHARE.localTransport,
    ),
  );

  const activityCost = round2(input.activityCost ?? input.userBudget * ORIENTATIVE_SHARE.activities);

  const insuranceCost = round2(INSURANCE_ESTIMATE_PER_PERSON * travelers);

  const totalTripCost = round2(
    mainTransportCost +
      accommodationCost +
      foodBudget +
      activityCost +
      localTransportCost +
      insuranceCost +
      emergencyReserve,
  );

  return {
    mainTransportCost,
    accommodationCost,
    foodBudget,
    activityCost,
    localTransportCost,
    insuranceCost,
    emergencyReserve,
    totalTripCost,
  };
}

// Sección 9, regla: totalTripCost <= userBudget. Se expone aparte de
// allocateBudget() porque el rechazo de combinaciones inviables es
// responsabilidad de validateCombination() (Fase 8), que reutilizará esta
// función en vez de repetir la comparación.
export function isWithinBudget(breakdown: BudgetBreakdown, userBudget: number): boolean {
  return breakdown.totalTripCost <= userBudget;
}
