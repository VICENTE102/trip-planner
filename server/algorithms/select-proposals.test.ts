import { describe, expect, it } from "vitest";
import type { AccommodationOffer } from "../types/accommodation.js";
import type { FlightOffer } from "../types/flight.js";
import type { BudgetBreakdown, ScoreBreakdown, TripCombination } from "../types/trip.js";
import { selectDiverseProposals, type ScoredCombination } from "./select-proposals.js";

const NO_PREFERENCES = {
  beach: 0,
  culture: 0,
  gastronomy: 0,
  nightlife: 0,
  nature: 0,
  shopping: 0,
  family: 0,
  relax: 0,
} as const;

// Los mismos pesos de calidad con los que el selector ordena el "nivel".
const QUALITY_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  price: 0,
  accommodationQuality: 0.35,
  location: 0.25,
  transportComfort: 0.25,
  usableTime: 0.05,
  preferenceMatch: 0.1,
};

const quality = (s: ScoreBreakdown) =>
  (Object.keys(QUALITY_WEIGHTS) as (keyof ScoreBreakdown)[]).reduce((t, k) => t + s[k] * QUALITY_WEIGHTS[k], 0);

function budget(total: number): BudgetBreakdown {
  return {
    mainTransportCost: total * 0.3,
    accommodationCost: total * 0.4,
    foodBudget: total * 0.15,
    activityCost: total * 0.1,
    localTransportCost: total * 0.03,
    insuranceCost: 12,
    emergencyReserve: total * 0.02,
    totalTripCost: total,
  };
}

/** Una combinación con el coste y la calidad que quiera la prueba. */
function combo(
  id: string,
  totalCost: number,
  scores: Partial<ScoreBreakdown> = {},
  hotelId = `hotel-${id}`,
): ScoredCombination {
  return {
    combination: {
      id,
      flight: { id: `flight-${id}`, stops: 0, baggageIncluded: true } as unknown as FlightOffer,
      accommodation: { id: hotelId, freeCancellation: true, distanceToCenterKm: 1 } as unknown as AccommodationOffer,
      activities: [],
      budget: budget(totalCost),
    } as unknown as TripCombination,
    scoreBreakdown: {
      price: 50,
      accommodationQuality: 50,
      location: 50,
      transportComfort: 50,
      usableTime: 50,
      preferenceMatch: 50,
      ...scores,
    },
  };
}

const context = {
  userBudget: 3000,
  travelers: 2,
  preferences: { ...NO_PREFERENCES },
  evaluatedCombinations: 100,
  discardedCombinations: 90,
  buildItinerary: async () => [],
};

const byType = (proposals: Awaited<ReturnType<typeof selectDiverseProposals>>) =>
  Object.fromEntries(proposals.map((p) => [p.type, p]));

describe("selectDiverseProposals · invariantes de los tres niveles", () => {
  // El fallo que se veía en pantalla: "Económico 1138€" encima de
  // "Equilibrado 1118€". Lo primero que lee el usuario, y contradice la
  // etiqueta. Ahora el orden se cumple por cómo se elige, no por suerte.
  it("económico <= equilibrado <= cómodo en precio", async () => {
    const proposals = await selectDiverseProposals(
      [
        combo("a", 1500, { accommodationQuality: 90, location: 90 }),
        combo("b", 1000, { accommodationQuality: 40 }),
        combo("c", 1200, { accommodationQuality: 60, location: 60 }),
        combo("d", 2000, { accommodationQuality: 95, location: 95 }),
      ],
      context,
    );

    const costes = proposals.map((p) => p.totalCost);
    expect(costes).toEqual([...costes].sort((x, y) => x - y));
    expect(proposals.map((p) => p.type)).toEqual(["economical", "recommended", "comfort"]);
  });

  it("el económico es de verdad el más barato del fondo", async () => {
    const candidatos = [combo("a", 1500), combo("b", 900), combo("c", 1200), combo("d", 2400)];
    const proposals = await selectDiverseProposals(candidatos, context);

    expect(byType(proposals).economical.totalCost).toBe(900);
  });

  // "En precio y en nivel": sin esto, el equilibrado podía costar más que el
  // económico y llevar aun así peor alojamiento.
  it("el nivel tampoco baja al subir de categoría", async () => {
    const proposals = await selectDiverseProposals(
      [
        combo("barato", 1000, { accommodationQuality: 70, location: 70, transportComfort: 70 }),
        combo("medio", 1200, { accommodationQuality: 30, location: 30, transportComfort: 30 }),
        combo("bueno", 1300, { accommodationQuality: 80, location: 80, transportComfort: 80 }),
        combo("mejor", 1900, { accommodationQuality: 95, location: 95, transportComfort: 95 }),
      ],
      context,
    );

    const niveles = proposals.map((p) => quality(p.scoreBreakdown));
    expect(niveles).toEqual([...niveles].sort((x, y) => x - y));
  });

  it("el cómodo se lleva la mejor calidad disponible", async () => {
    const proposals = await selectDiverseProposals(
      [
        combo("a", 1000, { accommodationQuality: 40 }),
        combo("b", 1400, { accommodationQuality: 60 }),
        combo("c", 1800, { accommodationQuality: 99, location: 99, transportComfort: 99 }),
      ],
      context,
    );

    expect(byType(proposals).comfort.accommodation.id).toBe("hotel-c");
  });

  // A igualdad de calidad gana la que más presupuesto aprovecha: es lo que
  // evita el "pongo 3.000 € y me propone el mismo hotel que con 1.500 €".
  it("con la misma calidad, el cómodo aprovecha más presupuesto", async () => {
    const iguales = { accommodationQuality: 90, location: 90, transportComfort: 90 };
    const proposals = await selectDiverseProposals(
      [combo("a", 1000, { accommodationQuality: 20 }), combo("b", 1500, iguales), combo("c", 2200, iguales)],
      context,
    );

    expect(byType(proposals).comfort.totalCost).toBe(2200);
  });

  it("prefiere alojamientos distintos entre propuestas", async () => {
    const proposals = await selectDiverseProposals(
      [
        combo("a", 1000, { accommodationQuality: 40 }, "hotel-compartido"),
        combo("b", 1300, { accommodationQuality: 70 }, "hotel-compartido"),
        combo("c", 1350, { accommodationQuality: 70 }, "hotel-propio"),
        combo("d", 1900, { accommodationQuality: 95 }, "hotel-lujo"),
      ],
      context,
    );

    const hoteles = proposals.map((p) => p.accommodation.id);
    expect(new Set(hoteles).size).toBe(hoteles.length);
  });

  // Preferible enseñar dos opciones honestas que tres mal etiquetadas.
  it("devuelve menos propuestas antes que etiquetar mal", async () => {
    const soloUna = await selectDiverseProposals([combo("a", 1000)], context);
    expect(soloUna).toHaveLength(1);
    expect(soloUna[0].type).toBe("economical");

    const dos = await selectDiverseProposals([combo("a", 1000), combo("b", 1600, { accommodationQuality: 90 })], context);
    expect(dos.map((p) => p.type)).toEqual(["economical", "comfort"]);
  });

  it("sin combinaciones no devuelve nada", async () => {
    expect(await selectDiverseProposals([], context)).toEqual([]);
  });

  it("el rank 1 sigue siendo la de mayor puntuación", async () => {
    const proposals = await selectDiverseProposals(
      [combo("a", 1000), combo("b", 1400, { accommodationQuality: 90 }), combo("c", 1900, { accommodationQuality: 95 })],
      context,
    );

    const mejor = [...proposals].sort((a, b) => b.score - a.score)[0];
    expect(mejor.rank).toBe(1);
  });
});
