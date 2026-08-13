import { describe, expect, it } from "vitest";
import type { PreferenceProfile, ScoreBreakdown } from "../types/trip.js";
import { calculatePreferenceScore } from "./score-preferences.js";
import { normalizeScore } from "./normalize-score.js";
import { calculateTripScore, meetsMinimumScores } from "./calculate-trip-score.js";

const breakdown = (overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown => ({
  price: 80,
  accommodationQuality: 80,
  location: 80,
  transportComfort: 80,
  usableTime: 80,
  preferenceMatch: 80,
  ...overrides,
});

describe("calculateTripScore", () => {
  it("los pesos suman 1: todo a 100 da 100", () => {
    expect(calculateTripScore(breakdown({ price: 100, accommodationQuality: 100, location: 100, transportComfort: 100, usableTime: 100, preferenceMatch: 100 }))).toBe(100);
  });

  it("todo a 0 da 0", () => {
    expect(calculateTripScore(breakdown({ price: 0, accommodationQuality: 0, location: 0, transportComfort: 0, usableTime: 0, preferenceMatch: 0 }))).toBe(0);
  });

  it("el precio pesa más que el tiempo aprovechable", () => {
    const subePrecio = calculateTripScore(breakdown({ price: 100 }));
    const subeTiempo = calculateTripScore(breakdown({ usableTime: 100 }));
    expect(subePrecio).toBeGreaterThan(subeTiempo);
  });
});

describe("meetsMinimumScores", () => {
  it("acepta un desglose por encima de todos los mínimos", () => {
    expect(meetsMinimumScores(breakdown()).passes).toBe(true);
  });

  // Sección 10.4: una media alta no debe tapar una carencia grave. Es el
  // umbral que delató el bug del selector de actividades.
  it("rechaza un preferenceMatch por debajo de 50 aunque la media sea buena", () => {
    const resultado = meetsMinimumScores(breakdown({ preferenceMatch: 37.5 }));
    expect(resultado.passes).toBe(false);
    expect(resultado.failedCriteria).toContain("preferenceMatch");
  });

  it("rechaza una ubicación mala", () => {
    expect(meetsMinimumScores(breakdown({ location: 44 })).passes).toBe(false);
  });

  it("rechaza un alojamiento por debajo de 55", () => {
    expect(meetsMinimumScores(breakdown({ accommodationQuality: 54 })).passes).toBe(false);
  });

  it("enumera todos los criterios que fallan, no solo el primero", () => {
    const resultado = meetsMinimumScores(breakdown({ location: 10, preferenceMatch: 10 }));
    expect(resultado.failedCriteria).toEqual(expect.arrayContaining(["location", "preferenceMatch"]));
  });

  it("no mira criterios sin mínimo definido", () => {
    expect(meetsMinimumScores(breakdown({ price: 0, usableTime: 0 })).passes).toBe(true);
  });
});

describe("normalizeScore", () => {
  it("puntúa 100 al mejor cuando menos es mejor", () => {
    expect(normalizeScore(100, 100, 500, "lowerIsBetter")).toBe(100);
    expect(normalizeScore(500, 100, 500, "lowerIsBetter")).toBe(0);
  });

  it("puntúa 100 al mayor cuando más es mejor", () => {
    expect(normalizeScore(500, 100, 500, "higherIsBetter")).toBe(100);
  });

  // Cuando no hay con qué comparar, todos empatan arriba: ninguno es peor
  // que los demás, así que no se penaliza a nadie por el criterio.
  it("puntúa 100 cuando todos los candidatos son iguales", () => {
    expect(normalizeScore(300, 300, 300, "lowerIsBetter")).toBe(100);
  });

  it("acota el resultado a 0-100 con valores fuera de rango", () => {
    expect(normalizeScore(600, 100, 500, "lowerIsBetter")).toBe(0);
    expect(normalizeScore(50, 100, 500, "lowerIsBetter")).toBe(100);
  });
});

describe("calculatePreferenceScore", () => {
  // El perfil exacto de la búsqueda que dejó el motor sin propuestas:
  // cultura 3, gastronomía 2, y tres preferencias a 1. Suma de pesos 8.
  const prefs = { beach: 0, culture: 3, gastronomy: 2, nightlife: 1, nature: 1, shopping: 0, family: 0, relax: 1 } as const;
  const nada = { beach: 0, culture: 0, gastronomy: 0, nightlife: 0, nature: 0, shopping: 0, family: 0, relax: 0 } as const;

  it("ignora las preferencias con peso 0", () => {
    const conPlaya = calculatePreferenceScore(prefs, { ...nada, beach: 3 });
    expect(conPlaya).toBe(calculatePreferenceScore(prefs, nada));
  });

  // Este es el cálculo exacto que hundía la puntuación cuando el itinerario
  // salía lleno de museos: solo cultura cubierta -> 37,5, por debajo del
  // mínimo de 50 de la sección 10.4, y todas las combinaciones descartadas.
  it("penaliza cubrir solo una de las preferencias pedidas", () => {
    const soloCultura = calculatePreferenceScore(prefs, { ...nada, culture: 3 });
    expect(soloCultura).toBeCloseTo(37.5, 1);
    expect(soloCultura).toBeLessThan(50);
  });

  it("cubrir todas las preferencias pedidas supera el mínimo", () => {
    const todas: PreferenceProfile = { ...nada, culture: 3, gastronomy: 3, nightlife: 3, nature: 3, relax: 3 };
    expect(calculatePreferenceScore(prefs, todas)).toBeGreaterThanOrEqual(50);
  });

  it("devuelve el valor neutro si el usuario no pidió nada", () => {
    expect(calculatePreferenceScore(nada, nada)).toBe(50);
  });
});
