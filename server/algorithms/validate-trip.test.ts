import { describe, expect, it } from "vitest";
import type { ItineraryDay, ItineraryItem } from "../types/itinerary.js";
import type { BudgetBreakdown, TripCombination } from "../types/trip.js";
import {
  detectOverlaps,
  repairInvalidItinerary,
  validateCombination,
  validateItinerary,
} from "./validate-trip.js";

const DATE = "2026-10-06";
const iso = (minutes: number) => new Date(Date.UTC(2026, 9, 6, 0, minutes)).toISOString();

function item(overrides: Partial<ItineraryItem> & { startMinutes: number; durationMinutes: number }): ItineraryItem {
  const { startMinutes, durationMinutes, ...rest } = overrides;
  return {
    id: `item-${startMinutes}`,
    type: "visit",
    title: `Bloque ${startMinutes}`,
    durationMinutes,
    startTime: iso(startMinutes),
    endTime: iso(startMinutes + durationMinutes),
    verificationStatus: "unverified",
    ...rest,
  };
}

const day = (items: ItineraryItem[]): ItineraryDay => ({ dayNumber: 2, date: DATE, items });

const budget: BudgetBreakdown = {
  mainTransportCost: 400,
  accommodationCost: 600,
  foodBudget: 150,
  activityCost: 200,
  localTransportCost: 40,
  insuranceCost: 24,
  emergencyReserve: 100,
  totalTripCost: 1514,
};

function combination(overrides: { budget?: Partial<BudgetBreakdown>; capacity?: number } = {}): TripCombination {
  return {
    id: "combo-1",
    flight: {} as TripCombination["flight"],
    accommodation: { capacity: overrides.capacity ?? 4 } as TripCombination["accommodation"],
    activities: [],
    budget: { ...budget, ...overrides.budget },
  };
}

describe("detectOverlaps", () => {
  it("no ve solapamiento cuando un bloque empieza justo al acabar el anterior", () => {
    expect(
      detectOverlaps([item({ startMinutes: 600, durationMinutes: 60 }), item({ startMinutes: 660, durationMinutes: 60 })]),
    ).toEqual([]);
  });

  it("detecta un solapamiento de un solo minuto", () => {
    const overlaps = detectOverlaps([
      item({ startMinutes: 600, durationMinutes: 60 }),
      item({ startMinutes: 659, durationMinutes: 60 }),
    ]);
    expect(overlaps).toHaveLength(1);
  });

  it("detecta solapamientos aunque los bloques lleguen desordenados", () => {
    const overlaps = detectOverlaps([
      item({ startMinutes: 659, durationMinutes: 60 }),
      item({ startMinutes: 600, durationMinutes: 60 }),
    ]);
    expect(overlaps).toHaveLength(1);
  });
});

describe("validateItinerary", () => {
  const conTiempoLibre = (extra: ItineraryItem[] = []) =>
    day([item({ startMinutes: 540, durationMinutes: 60, type: "free_time", title: "Tiempo libre" }), ...extra]);

  it("acepta un día correcto", () => {
    expect(validateItinerary([conTiempoLibre()])).toEqual([]);
  });

  it("avisa si el día no llega al mínimo de tiempo libre", () => {
    const errores = validateItinerary([day([item({ startMinutes: 600, durationMinutes: 60 })])]);
    expect(errores.map((e) => e.code)).toContain("INSUFFICIENT_FREE_TIME");
  });

  it("avisa si el día programa más de 3 visitas", () => {
    const visitas = [660, 780, 900, 1020].map((m) => item({ startMinutes: m, durationMinutes: 60 }));
    const errores = validateItinerary([conTiempoLibre(visitas)]);
    expect(errores.map((e) => e.code)).toContain("TOO_MANY_VISITS");
  });

  it("avisa de los solapamientos", () => {
    const errores = validateItinerary([
      conTiempoLibre([item({ startMinutes: 660, durationMinutes: 60 }), item({ startMinutes: 700, durationMinutes: 60 })]),
    ]);
    expect(errores.map((e) => e.code)).toContain("ITINERARY_OVERLAP");
  });
});

describe("repairInvalidItinerary", () => {
  it("separa los bloques solapados y deja el día limpio", () => {
    const roto = day([item({ startMinutes: 600, durationMinutes: 60 }), item({ startMinutes: 620, durationMinutes: 60 })]);
    const errores = validateItinerary([roto]);
    const [reparado] = repairInvalidItinerary([roto], errores);

    expect(detectOverlaps(reparado.items)).toEqual([]);
  });

  it("añade el tiempo libre que falta hasta el mínimo", () => {
    const corto = day([item({ startMinutes: 600, durationMinutes: 60 })]);
    const [reparado] = repairInvalidItinerary([corto], validateItinerary([corto]));

    const libre = reparado.items
      .filter((i) => i.type === "free_time")
      .reduce((sum, i) => sum + i.durationMinutes, 0);
    expect(libre).toBeGreaterThanOrEqual(60);
  });

  it("deja intactos los días que ya eran válidos", () => {
    const bueno = day([item({ startMinutes: 540, durationMinutes: 60, type: "free_time", title: "Tiempo libre" })]);
    const [resultado] = repairInvalidItinerary([bueno], []);
    expect(resultado).toBe(bueno);
  });
});

describe("validateCombination", () => {
  it("acepta una combinación viable", () => {
    expect(validateCombination(combination(), { userBudget: 2000, travelers: 2 }).valid).toBe(true);
  });

  it("descarta la que se pasa de presupuesto", () => {
    const resultado = validateCombination(combination(), { userBudget: 1000, travelers: 2 });
    expect(resultado.valid).toBe(false);
    expect(resultado.errors.map((e) => e.code)).toContain("OVER_BUDGET");
  });

  it("descarta el alojamiento que no cabe a todos los viajeros", () => {
    const resultado = validateCombination(combination({ capacity: 2 }), { userBudget: 2000, travelers: 4 });
    expect(resultado.errors.map((e) => e.code)).toContain("INSUFFICIENT_CAPACITY");
  });

  it("descarta un viaje sin presupuesto de comidas", () => {
    const resultado = validateCombination(combination({ budget: { foodBudget: 0 } }), { userBudget: 2000, travelers: 2 });
    expect(resultado.errors.map((e) => e.code)).toContain("NO_FOOD_BUDGET");
  });

  it("descarta un viaje sin reserva de imprevistos", () => {
    const resultado = validateCombination(combination({ budget: { emergencyReserve: 0 } }), {
      userBudget: 2000,
      travelers: 2,
    });
    expect(resultado.errors.map((e) => e.code)).toContain("NO_EMERGENCY_RESERVE");
  });

  it("acumula todos los motivos de descarte, no solo el primero", () => {
    const resultado = validateCombination(combination({ budget: { foodBudget: 0, localTransportCost: 0 } }), {
      userBudget: 1000,
      travelers: 2,
    });
    expect(resultado.errors.length).toBeGreaterThanOrEqual(3);
  });
});
