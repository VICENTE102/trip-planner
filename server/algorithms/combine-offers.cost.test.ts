import { describe, expect, it, vi } from "vitest";
import type { PreferenceLevel, PreferenceProfile, TravelPreference } from "../types/trip.js";

// Cuenta cuántas veces se calcula la afinidad de una actividad.
//
// Es la única parte cara de la selección: recorre las ocho preferencias y
// antes se llamaba desde dentro del comparador de un `sort`, o sea dos veces
// por comparación. Si alguien vuelve a moverla dentro del bucle de
// combinaciones, el trabajo se multiplica por las ~285 combinaciones de una
// búsqueda normal — y para nada, porque la afinidad solo depende de las
// preferencias del usuario y da el mismo número las 285 veces.
let llamadas = 0;

vi.mock("./score-preferences.js", async (original) => {
  const real = await original<typeof import("./score-preferences.js")>();
  return {
    ...real,
    calculatePreferenceScore: (...args: Parameters<typeof real.calculatePreferenceScore>) => {
      llamadas++;
      return real.calculatePreferenceScore(...args);
    },
  };
});

const { combineOffers } = await import("./combine-offers.js");

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

const actividades = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `act-${i}`,
    name: `Actividad ${i}`,
    category: "generica",
    profile: profile({ culture: ((i % 3) + 1) as PreferenceLevel }),
    latitude: 41.89 + (i % 20) / 500,
    longitude: 12.48 + (i % 17) / 500,
    estimatedDurationMinutes: 90,
    pricePerPerson: 10,
    verificationStatus: "partial" as const,
  }));

const vuelos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `f-${i}`,
    provider: "MockFlightProvider",
    outbound: [
      {
        id: `s-${i}`,
        carrier: "IB",
        flightNumber: `IB${i}`,
        origin: "MAD",
        destination: "FCO",
        departureTime: "2026-10-05T08:00:00.000Z",
        arrivalTime: "2026-10-05T10:30:00.000Z",
        durationMinutes: 150,
      },
    ],
    stops: 0,
    totalDurationMinutes: 150 + i,
    totalPrice: 150 + i * 5,
    currency: "EUR",
    baggageIncluded: true,
    refundable: false,
    fetchedAt: "2026-10-01T00:00:00.000Z",
  }));

const hoteles = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `h-${i}`,
    provider: "MockAccommodationProvider",
    name: `Hotel ${i}`,
    totalPrice: 200 + i * 20,
    currency: "EUR",
    rating: 3 + (i % 20) / 10,
    reviewCount: 300,
    latitude: 41.89 + (i % 13) / 400,
    longitude: 12.48 + (i % 11) / 400,
    distanceToCenterKm: 1 + (i % 5),
    amenities: ["Wifi gratis"],
    capacity: 4,
    fetchedAt: "2026-10-01T00:00:00.000Z",
  }));

describe("combineOffers · coste acotado", () => {
  it("calcula la afinidad una vez por actividad, no una vez por combinación", () => {
    const NUM_ACTIVIDADES = 200;
    const NUM_VUELOS = 15;
    const NUM_HOTELES = 19;

    llamadas = 0;
    const combos = combineOffers(vuelos(NUM_VUELOS), hoteles(NUM_HOTELES), actividades(NUM_ACTIVIDADES), {
      travelers: 2,
      days: 5,
      userBudget: 5000,
      preferences: profile({ culture: 3, gastronomy: 2 }),
    });

    expect(combos).toHaveLength(NUM_VUELOS * NUM_HOTELES);

    // Una por actividad. Se deja holgura por si el motor añade algún
    // cálculo puntual, pero muy lejos de las 200 × 285 = 57.000 que
    // costaría reordenar el fondo dentro del bucle.
    expect(llamadas).toBeLessThanOrEqual(NUM_ACTIVIDADES * 2);
  });

  it("no repite la selección para el mismo hotel en distintos vuelos", () => {
    const combos = combineOffers(vuelos(10), hoteles(3), actividades(50), {
      travelers: 2,
      days: 4,
      userBudget: 5000,
      preferences: profile({ culture: 3 }),
    });

    // El mismo hotel aparece en 10 combinaciones (una por vuelo) y en todas
    // se le asigna exactamente la misma selección, memorizada.
    const delMismoHotel = combos.filter((c) => c.accommodation.id === "h-0");
    expect(delMismoHotel).toHaveLength(10);
    for (const combo of delMismoHotel) {
      expect(combo.activities).toBe(delMismoHotel[0].activities);
    }
  });
});
