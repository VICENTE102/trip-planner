import { describe, expect, it } from "vitest";
import type { AccommodationOffer } from "../types/accommodation.js";
import type { ActivityCandidate } from "../types/activity.js";
import type { FlightOffer } from "../types/flight.js";
import type { PreferenceLevel, PreferenceProfile, TravelPreference } from "../types/trip.js";
import { analyzeBudgetUnlock } from "./budget-unlock.js";

const ZERO: PreferenceProfile = {
  beach: 0,
  culture: 0,
  gastronomy: 0,
  nightlife: 0,
  nature: 0,
  shopping: 0,
  family: 0,
  relax: 0,
};

const profile = (o: Partial<Record<TravelPreference, PreferenceLevel>>): PreferenceProfile => ({ ...ZERO, ...o });

const actividades = (n: number): ActivityCandidate[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `act-${i}`,
    name: `Actividad ${i}`,
    category: "generica",
    profile: profile({ culture: 2 }),
    latitude: 41.89 + (i % 20) / 500,
    longitude: 12.48 + (i % 17) / 500,
    estimatedDurationMinutes: 90,
    pricePerPerson: 10,
    verificationStatus: "partial" as const,
  }));

const vuelo = (id: string, totalPrice: number): FlightOffer => ({
  id,
  provider: "MockFlightProvider",
  outbound: [
    {
      id: `s-${id}`,
      carrier: "IB",
      flightNumber: "IB1",
      origin: "MAD",
      destination: "FCO",
      departureTime: "2026-10-05T08:00:00.000Z",
      arrivalTime: "2026-10-05T10:30:00.000Z",
      durationMinutes: 150,
    },
  ],
  stops: 0,
  totalDurationMinutes: 150,
  totalPrice,
  currency: "EUR",
  baggageIncluded: true,
  refundable: false,
  fetchedAt: "2026-10-01T00:00:00.000Z",
});

// Un fondo de hoteles como el que devuelve el proveedor: cuanto más caro,
// mejor nota y más cerca del centro.
//
// Que pagar más compre algo no es un adorno del fixture. Un hotel que solo
// cuesta más es estrictamente peor y el filtro de Pareto lo descarta, así
// que con hoteles idénticos salvo el precio ningún aumento de presupuesto
// abriría nada y estas pruebas pasarían por el motivo equivocado.
//
// Seis y no dos porque las puntuaciones de alojamiento son relativas al
// fondo: con dos hoteles el peor saca un 0 y no pasa el umbral de calidad,
// lo que falsea la cuenta.
const fondoDeHoteles = (n: number): AccommodationOffer[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `h${i}`,
    provider: "MockAccommodationProvider",
    name: `Hotel ${i}`,
    totalPrice: 250 + i * 150,
    currency: "EUR",
    rating: 3.2 + i * 0.35,
    reviewCount: 300,
    latitude: 41.9,
    longitude: 12.5,
    distanceToCenterKm: 5 - i * 0.7,
    amenities: ["Wifi gratis"],
    capacity: 4,
    fetchedAt: "2026-10-01T00:00:00.000Z",
  }));

const CONTEXT = { travelers: 2, days: 5, preferences: profile({ culture: 2 }) };
const VUELOS = [vuelo("f1", 150)];

const analizar = (hoteles: AccommodationOffer[], userBudget: number) =>
  analyzeBudgetUnlock(VUELOS, hoteles, actividades(20), { ...CONTEXT, userBudget });

describe("analyzeBudgetUnlock", () => {
  // El caso que lo motiva: Madrid -> Roma, 7 noches, dos personas, 2.000 €.
  // De 255 combinaciones sobreviven 4, un solo hotel entra en presupuesto y
  // las tres propuestas salían con él.
  it("dice cuánto falta y cuántas opciones se abren cuando solo cabe un hotel", () => {
    const unlock = analizar(fondoDeHoteles(6), 1800);

    expect(unlock).not.toBeNull();
    expect(unlock!.currentOptions).toBe(1);
    expect(unlock!.unlockedOptions).toBe(2);
    expect(unlock!.extraBudget).toBe(200);
  });

  // Si con lo que hay ya se puede elegir, no hay nada que sugerir: soltar un
  // "sube el presupuesto" a quien ya tiene alternativas es empujar a gastar
  // de más sin motivo.
  it("no dice nada cuando ya hay variedad", () => {
    expect(analizar(fondoDeHoteles(6), 3000)).toBeNull();
  });

  // Y si ni subiendo la mitad se abre nada, el problema no es el dinero: son
  // las fechas o el destino. Prometer lo contrario sería mentir.
  it("no promete nada si ningún aumento razonable abre alternativas", () => {
    const inalcanzables = fondoDeHoteles(6).map((h, i) =>
      i === 0 ? h : { ...h, totalPrice: 90000 + i },
    );

    expect(analizar(inalcanzables, 1800)).toBeNull();
  });

  // El escalón que se propone es el más pequeño que sirve. Con 1.800 € el
  // 10% (180 €, redondeado a 200 €) ya abre el segundo hotel; sugerir el 50%
  // porque abre cinco sería empujar a gastar cuatro veces más de lo
  // necesario.
  it("propone el salto más pequeño que abre algo, no el más grande", () => {
    const unlock = analizar(fondoDeHoteles(6), 1800);

    expect(unlock!.extraBudget).toBe(200);
    expect(unlock!.extraBudget).toBeLessThan(1800 * 0.2);
  });

  // La cifra se dice en voz alta ("con 250 € más"), así que fingir precisión
  // al euro sería falso: los precios cambian entre búsquedas.
  it("redondea el importe a una cifra que alguien diría en voz alta", () => {
    let respuestas = 0;
    for (const presupuesto of [1137, 1413, 1607, 1751, 1804]) {
      const unlock = analizar(fondoDeHoteles(6), presupuesto);
      if (!unlock) continue; // con ese presupuesto ya hay variedad
      respuestas++;
      expect(unlock.extraBudget % 10, `${unlock.extraBudget}€ no es una cifra redonda`).toBe(0);
    }
    expect(respuestas, "ningún presupuesto dio respuesta: la prueba no comprueba nada").toBeGreaterThan(0);
  });

  // Cuando no hay NINGUNA propuesta es cuando más falta hace: la pantalla de
  // cero resultados ya dice cuánto cuesta lo más barato, y esto le añade
  // cuántas opciones se abren. currentOptions = 0 es un estado legítimo, no
  // un fallo de la cuenta.
  it("también responde cuando ahora mismo no hay ninguna opción", () => {
    const unlock = analizar(fondoDeHoteles(6), 1400);

    expect(unlock).not.toBeNull();
    expect(unlock!.currentOptions).toBe(0);
    expect(unlock!.unlockedOptions).toBeGreaterThan(0);
  });

  // Invariante: nunca se anuncia un aumento que no aumenta nada.
  it("nunca anuncia opciones que no crecen", () => {
    for (const presupuesto of [1100, 1400, 1600, 1800, 2200, 3000, 5000]) {
      const unlock = analizar(fondoDeHoteles(6), presupuesto);
      if (unlock) {
        expect(unlock.unlockedOptions, `${presupuesto}€`).toBeGreaterThan(unlock.currentOptions);
        expect(unlock.extraBudget, `${presupuesto}€`).toBeGreaterThan(0);
      }
    }
  });
});
