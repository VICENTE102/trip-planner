import { describe, expect, it } from "vitest";
import { CACHE_TTL_DAYS, daysSince, isExpired } from "./cache-policy.js";

const AHORA = Date.parse("2026-08-23T12:00:00.000Z");
const haceDias = (dias: number) => new Date(AHORA - dias * 24 * 60 * 60 * 1000).toISOString();

describe("isExpired", () => {
  it("un dato de ayer sigue valiendo", () => {
    expect(isExpired(haceDias(1), 30, AHORA)).toBe(false);
  });

  it("justo en el límite todavía vale", () => {
    expect(isExpired(haceDias(30), 30, AHORA)).toBe(false);
  });

  it("un día después ya no", () => {
    expect(isExpired(haceDias(31), 30, AHORA)).toBe(true);
  });

  // Una fila sin fecha viene de antes de que existiera esta política. Es más
  // seguro volver a pedir el dato que confiar en uno de origen desconocido.
  it("sin fecha se considera caducado", () => {
    expect(isExpired(null, 365, AHORA)).toBe(true);
    expect(isExpired(undefined, 365, AHORA)).toBe(true);
    expect(isExpired("no es una fecha", 365, AHORA)).toBe(true);
  });

  // Un reloj desajustado o una fila escrita a mano no son motivo para tirar
  // un dato bueno.
  it("una fecha futura no caduca", () => {
    expect(isExpired(new Date(AHORA + 86400000).toISOString(), 30, AHORA)).toBe(false);
  });
});

describe("política por tipo de dato", () => {
  // EL caso que motiva tener plazos distintos. Un "no encontrado" se cachea a
  // propósito, pero guardarlo para siempre significa que un mal día del
  // proveedor deja ese destino roto de forma permanente.
  it("un 'no encontrado' se olvida mucho antes que unas coordenadas buenas", () => {
    const hace60dias = haceDias(60);

    expect(isExpired(hace60dias, CACHE_TTL_DAYS.geocodingNotFound, AHORA)).toBe(true);
    expect(isExpired(hace60dias, CACHE_TTL_DAYS.geocodingFound, AHORA)).toBe(false);
  });

  it("las rutas duran más que un 'no encontrado' y menos que unas coordenadas", () => {
    expect(CACHE_TTL_DAYS.routes).toBeGreaterThan(CACHE_TTL_DAYS.geocodingNotFound);
    expect(CACHE_TTL_DAYS.routes).toBeLessThan(CACHE_TTL_DAYS.geocodingFound);
  });

  // `places` no se rellena sola: si caducara de verdad, el destino se
  // quedaría sin sitios reales y el itinerario volvería al mock en silencio.
  // Su plazo existe solo para que el cargador avise.
  it("el plazo de places es el más corto, porque solo sirve para avisar", () => {
    expect(CACHE_TTL_DAYS.placesStale).toBeLessThan(CACHE_TTL_DAYS.routes);
  });
});

describe("daysSince", () => {
  it("cuenta los días transcurridos", () => {
    expect(daysSince(haceDias(97), AHORA)).toBe(97);
  });

  it("no devuelve nada si no hay fecha utilizable", () => {
    expect(daysSince(null, AHORA)).toBeUndefined();
    expect(daysSince("ayer", AHORA)).toBeUndefined();
  });
});
