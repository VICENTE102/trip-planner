import { describe, expect, it } from "vitest";
import { formatDateRange, nightsBetween } from "./dates";

describe("formatDateRange", () => {
  it("dentro del mismo mes no repite el mes", () => {
    expect(formatDateRange("2026-08-24", "2026-08-31")).toBe("24 – 31 ago 2026");
  });

  it("a caballo entre dos meses nombra los dos", () => {
    expect(formatDateRange("2026-11-28", "2026-12-03")).toBe("28 nov – 3 dic 2026");
  });

  // Nochevieja fuera es un caso real, y "28 dic – 3 ene 2027" daría a
  // entender que se sale en diciembre de 2027.
  it("a caballo entre dos años dice los dos", () => {
    expect(formatDateRange("2026-12-28", "2027-01-03")).toBe("28 dic 2026 – 3 ene 2027");
  });

  it("un viaje de un solo día no se rompe", () => {
    expect(formatDateRange("2026-08-24", "2026-08-24")).toBe("24 – 24 ago 2026");
  });

  // El año se dice SIEMPRE, aunque sea el actual: en "Mis viajes" conviven
  // viajes de años distintos y sin él no se distinguen.
  it("siempre incluye el año", () => {
    for (const rango of [
      formatDateRange("2026-08-24", "2026-08-31"),
      formatDateRange("2026-11-28", "2026-12-03"),
      formatDateRange("2026-12-28", "2027-01-03"),
    ]) {
      expect(rango).toMatch(/20\d\d/);
    }
  });

  // Nunca debe escaparse un ISO a la pantalla, que es lo que venía pasando.
  it("no deja escapar una fecha en crudo", () => {
    expect(formatDateRange("2026-08-24", "2026-08-31")).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("si le dan basura, la devuelve tal cual en vez de decir 'Invalid Date'", () => {
    expect(formatDateRange("ayer", "mañana")).toBe("ayer – mañana");
  });
});

describe("nightsBetween", () => {
  it("cuenta las noches, no los días", () => {
    expect(nightsBetween("2026-08-24", "2026-08-31")).toBe(7);
  });

  it("ida y vuelta el mismo día son cero noches", () => {
    expect(nightsBetween("2026-08-24", "2026-08-24")).toBe(0);
  });
});
