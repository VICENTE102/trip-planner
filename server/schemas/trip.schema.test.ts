import { describe, expect, it } from "vitest";
import { tripRequestSchema } from "./trip.schema.js";

const VALIDA = {
  origin: "Madrid",
  destination: "Roma",
  departureDate: "2026-10-05",
  returnDate: "2026-10-09",
  travelers: { adults: 2, children: 0 },
  budget: 2000,
  currency: "EUR",
  travelStyle: "balanced",
  preferences: { beach: 0, culture: 3, gastronomy: 2, nightlife: 1, nature: 1, shopping: 0, family: 0, relax: 1 },
};

const conCambio = (cambios: Record<string, unknown>) => ({ ...VALIDA, ...cambios });

function rutasDeError(input: unknown): string[] {
  const resultado = tripRequestSchema.safeParse(input);
  expect(resultado.success, "se esperaba que la validación fallara").toBe(false);
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.path.join("."));
}

describe("tripRequestSchema", () => {
  it("acepta una petición completa y convierte las fechas", () => {
    const resultado = tripRequestSchema.safeParse(VALIDA);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.departureDate).toBeInstanceOf(Date);
      expect(resultado.data.returnDate).toBeInstanceOf(Date);
    }
  });

  it("acepta que falte constraints, que es opcional", () => {
    expect(tripRequestSchema.safeParse(VALIDA).success).toBe(true);
  });

  it("rechaza que la vuelta sea anterior a la ida", () => {
    expect(rutasDeError(conCambio({ returnDate: "2026-10-01" }))).toContain("returnDate");
  });

  it("rechaza que ida y vuelta sean el mismo día", () => {
    expect(rutasDeError(conCambio({ returnDate: VALIDA.departureDate }))).toContain("returnDate");
  });

  it("rechaza un presupuesto de cero o negativo", () => {
    expect(rutasDeError(conCambio({ budget: 0 }))).toContain("budget");
    expect(rutasDeError(conCambio({ budget: -100 }))).toContain("budget");
  });

  it("rechaza viajar con cero adultos", () => {
    expect(rutasDeError(conCambio({ travelers: { adults: 0, children: 2 } }))).toContain("travelers.adults");
  });

  it("rechaza preferencias fuera del rango 0-3", () => {
    expect(rutasDeError(conCambio({ preferences: { ...VALIDA.preferences, culture: 4 } }))).toContain(
      "preferences.culture",
    );
    expect(rutasDeError(conCambio({ preferences: { ...VALIDA.preferences, culture: -1 } }))).toContain(
      "preferences.culture",
    );
  });

  it("rechaza preferencias no enteras", () => {
    expect(rutasDeError(conCambio({ preferences: { ...VALIDA.preferences, culture: 2.5 } }))).toContain(
      "preferences.culture",
    );
  });

  it("rechaza monedas y estilos no admitidos", () => {
    expect(rutasDeError(conCambio({ currency: "MXN" }))).toContain("currency");
    expect(rutasDeError(conCambio({ travelStyle: "lujo" }))).toContain("travelStyle");
  });

  it("rechaza un destino demasiado corto", () => {
    expect(rutasDeError(conCambio({ destination: "R" }))).toContain("destination");
  });

  it("recorta los espacios de origen y destino", () => {
    const resultado = tripRequestSchema.safeParse(conCambio({ destination: "  Roma  " }));
    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.destination).toBe("Roma");
  });
});
