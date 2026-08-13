import { describe, expect, it } from "vitest";
import { allocateBudget, isWithinBudget } from "./allocate-budget.js";

const BASE = {
  userBudget: 2000,
  travelers: 2,
  days: 5,
  mainTransportCost: 400,
  accommodationCost: 600,
};

describe("allocateBudget", () => {
  it("suma las siete partidas en totalTripCost", () => {
    const b = allocateBudget(BASE);
    const suma =
      b.mainTransportCost +
      b.accommodationCost +
      b.foodBudget +
      b.activityCost +
      b.localTransportCost +
      b.insuranceCost +
      b.emergencyReserve;

    expect(b.totalTripCost).toBeCloseTo(suma, 2);
  });

  it("respeta los costes reales de vuelo y alojamiento que se le pasan", () => {
    const b = allocateBudget(BASE);
    expect(b.mainTransportCost).toBe(400);
    expect(b.accommodationCost).toBe(600);
  });

  it("garantiza el mínimo diario de comida por persona", () => {
    // Con presupuesto muy bajo, el 15% orientativo se queda por debajo del
    // mínimo de 15 €/día/persona y debe ganar el mínimo.
    const b = allocateBudget({ ...BASE, userBudget: 200 });
    expect(b.foodBudget).toBe(15 * 5 * 2);
  });

  it("usa el porcentaje orientativo cuando supera el mínimo diario", () => {
    const b = allocateBudget({ ...BASE, userBudget: 4000 });
    expect(b.foodBudget).toBe(600); // 15% de 4000, por encima del mínimo de 150
  });

  it("garantiza el mínimo diario de transporte local", () => {
    const b = allocateBudget({ ...BASE, userBudget: 200 });
    expect(b.localTransportCost).toBe(4 * 5 * 2);
  });

  it("reserva el 5% de imprevistos sobre el presupuesto del usuario", () => {
    expect(allocateBudget(BASE).emergencyReserve).toBe(100);
  });

  it("estima el seguro por viajero", () => {
    expect(allocateBudget(BASE).insuranceCost).toBe(24);
    expect(allocateBudget({ ...BASE, travelers: 4 }).insuranceCost).toBe(48);
  });

  it("usa el coste real de actividades cuando se conoce", () => {
    expect(allocateBudget({ ...BASE, activityCost: 137 }).activityCost).toBe(137);
  });

  it("estima las actividades por porcentaje cuando aún no se conocen", () => {
    expect(allocateBudget(BASE).activityCost).toBe(200); // 10% de 2000
  });

  // Casos límite: la función no debe dividir por cero ni devolver negativos
  // aunque le llegue basura desde arriba.
  it("trata 0 viajeros y 0 días como 1 sin romperse", () => {
    const b = allocateBudget({ ...BASE, travelers: 0, days: 0 });
    expect(b.foodBudget).toBe(300); // 15% de 2000, por encima del mínimo de 1x1
    expect(b.insuranceCost).toBe(12); // un viajero
    expect(b.totalTripCost).toBeGreaterThan(0);
  });

  it("nunca devuelve partidas negativas", () => {
    for (const partida of Object.values(allocateBudget({ ...BASE, userBudget: 1 }))) {
      expect(partida).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("isWithinBudget", () => {
  it("acepta lo que cabe justo en el presupuesto", () => {
    const b = allocateBudget(BASE);
    expect(isWithinBudget(b, b.totalTripCost)).toBe(true);
  });

  it("rechaza lo que se pasa por un céntimo", () => {
    const b = allocateBudget(BASE);
    expect(isWithinBudget(b, b.totalTripCost - 0.01)).toBe(false);
  });
});
