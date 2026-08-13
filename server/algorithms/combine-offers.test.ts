import { describe, expect, it } from "vitest";
import type { AccommodationOffer } from "../types/accommodation.js";
import type { ActivityCandidate } from "../types/activity.js";
import type { FlightOffer } from "../types/flight.js";
import type { PreferenceLevel, PreferenceProfile, TravelPreference } from "../types/trip.js";
import { calculatePreferenceScore } from "./score-preferences.js";
import { combineOffers } from "./combine-offers.js";

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

const profile = (overrides: Partial<Record<TravelPreference, PreferenceLevel>>): PreferenceProfile => ({
  ...ZERO,
  ...overrides,
});

function activity(id: string, prefs: Partial<Record<TravelPreference, PreferenceLevel>>): ActivityCandidate {
  return {
    id,
    name: `Actividad ${id}`,
    category: "generica",
    profile: profile(prefs),
    latitude: 41.9,
    longitude: 12.5,
    estimatedDurationMinutes: 90,
    pricePerPerson: 10,
    verificationStatus: "partial",
  };
}

const flight: FlightOffer = {
  id: "flight-1",
  provider: "MockFlightProvider",
  outbound: [
    {
      id: "seg-1",
      carrier: "IB",
      flightNumber: "IB1000",
      origin: "MAD",
      destination: "FCO",
      departureTime: "2026-10-05T08:00:00.000Z",
      arrivalTime: "2026-10-05T10:30:00.000Z",
      durationMinutes: 150,
    },
  ],
  stops: 0,
  totalDurationMinutes: 150,
  totalPrice: 200,
  currency: "EUR",
  baggageIncluded: true,
  refundable: false,
  fetchedAt: "2026-10-01T00:00:00.000Z",
};

const accommodation: AccommodationOffer = {
  id: "hotel-1",
  provider: "MockAccommodationProvider",
  name: "Hotel de prueba",
  totalPrice: 400,
  currency: "EUR",
  rating: 4.2,
  reviewCount: 300,
  latitude: 41.9,
  longitude: 12.5,
  distanceToCenterKm: 1.5,
  amenities: ["Wifi gratis"],
  capacity: 4,
  fetchedAt: "2026-10-01T00:00:00.000Z",
};

// Reproduce la situación exacta que rompió el motor al llegar los POI
// reales: Roma tiene catorce actividades de cultura pura, así que un
// selector que ordenaba por afinidad y cortaba los N primeros llenaba el
// itinerario entero de museos e iglesias.
const CULTURA_ABUNDANTE = Array.from({ length: 14 }, (_, i) => activity(`cultura-${i}`, { culture: 3 }));
const RESTO_ESCASO = [
  activity("gastro-0", { gastronomy: 3, nightlife: 1 }),
  activity("gastro-1", { gastronomy: 3 }),
  activity("noche-0", { nightlife: 3 }),
  activity("natura-0", { nature: 3 }),
  activity("relax-0", { relax: 3 }),
];
const CANDIDATAS = [...CULTURA_ABUNDANTE, ...RESTO_ESCASO];

describe("combineOffers · selección de actividades", () => {
  // El perfil de la búsqueda real: cinco preferencias con peso, suma 8. Con
  // solo dos preferencias la media no baja lo suficiente y el umbral de la
  // sección 10.4 no llega a saltar, que es lo que hacía que este bug fuera
  // invisible hasta tener datos reales.
  const preferencias = profile({ culture: 3, gastronomy: 2, nightlife: 1, nature: 1, relax: 1 });

  it("no llena el itinerario con una sola categoría cuando sobran candidatas de esa categoría", () => {
    const [combination] = combineOffers(
      [flight],
      [accommodation],
      CANDIDATAS,
      { travelers: 2, days: 5, userBudget: 2000, preferences: preferencias },
    );

    const conGastronomia = combination.activities.filter((a) => a.profile.gastronomy > 0);
    expect(
      conGastronomia.length,
      "quien pide gastronomía 2 debe llevarse alguna actividad de gastronomía, no solo museos",
    ).toBeGreaterThan(0);

    const conCultura = combination.activities.filter((a) => a.profile.culture > 0);
    expect(conCultura.length, "y la cultura, que pesa más, debe seguir siendo mayoría").toBeGreaterThan(
      conGastronomia.length,
    );
  });

  it("el perfil agregado supera el mínimo de preferenceMatch de la sección 10.4", () => {
    const [combination] = combineOffers(
      [flight],
      [accommodation],
      CANDIDATAS,
      { travelers: 2, days: 5, userBudget: 2000, preferences: preferencias },
    );

    // Mismo cálculo que buildScoreBreakdown: el mejor valor de cada
    // preferencia entre las actividades elegidas.
    const agregado = { ...ZERO } as PreferenceProfile;
    for (const key of Object.keys(ZERO) as TravelPreference[]) {
      agregado[key] = Math.max(...combination.activities.map((a) => a.profile[key])) as PreferenceLevel;
    }

    expect(calculatePreferenceScore(preferencias, agregado)).toBeGreaterThanOrEqual(50);
  });

  it("no reparte cupo a preferencias que el usuario ha puesto a 0", () => {
    const soloCultura = profile({ culture: 3 });
    const [combination] = combineOffers(
      [flight],
      [accommodation],
      [...CANDIDATAS, activity("playa-0", { beach: 3 })],
      { travelers: 2, days: 5, userBudget: 2000, preferences: soloCultura },
    );

    expect(combination.activities.some((a) => a.id === "playa-0")).toBe(false);
  });

  it("descarta las combinaciones que no caben en el presupuesto", () => {
    const combinations = combineOffers([flight], [accommodation], CULTURA_ABUNDANTE, {
      travelers: 2,
      days: 5,
      userBudget: 100,
      preferences: preferencias,
    });

    for (const combination of combinations) {
      expect(combination.budget.totalTripCost).toBeGreaterThan(100);
    }
  });
});
