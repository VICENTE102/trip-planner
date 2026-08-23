import { describe, expect, it } from "vitest";
import type { SearchParams } from "../types";
import { pickDistinguishingReasons, toSearchResult } from "./tripAdapter";
import type { GenerateTripResponse, TripProposal as BackendTripProposal } from "./trip-api.client";

// Las razones tal cual las escribe el motor en una búsqueda real de Roma.
const ECONOMICA = [
  "Está un 34% por debajo del presupuesto.",
  "El alojamiento se encuentra a 4.2 km del centro.",
  "La afinidad con la cultura y la gastronomía es alta.",
];
const EQUILIBRADA = [
  "Está un 31% por debajo del presupuesto.",
  "El alojamiento se encuentra a 1.9 km del centro.",
  "El vuelo de ida es directo, sin escalas.",
  "La afinidad con la cultura y la gastronomía es alta.",
];
const COMODA = [
  "Está un 6% por debajo del presupuesto.",
  "El alojamiento se encuentra a 1.0 km del centro.",
  "El vuelo de ida es directo, sin escalas.",
  "La afinidad con la cultura y la gastronomía es alta.",
  "El alojamiento tiene una valoración de 4.6/5.",
];

const TODAS = [ECONOMICA, EQUILIBRADA, COMODA];

describe("pickDistinguishingReasons", () => {
  // La frase de afinidad sale idéntica en las tres porque se deriva de las
  // preferencias del usuario, no de la propuesta. En una comparativa, una
  // línea repetida en las tres columnas no compara nada.
  it("descarta la razón que aparece igual en todas las propuestas", () => {
    for (const reasons of TODAS) {
      const distinguishing = pickDistinguishingReasons(reasons, TODAS);
      expect(distinguishing).not.toContain("La afinidad con la cultura y la gastronomía es alta.");
    }
  });

  it("conserva las que sí diferencian", () => {
    const distinguishing = pickDistinguishingReasons(COMODA, TODAS);
    expect(distinguishing).toContain("El alojamiento se encuentra a 1.0 km del centro.");
    expect(distinguishing).toContain("El alojamiento tiene una valoración de 4.6/5.");
  });

  // "El vuelo de ida es directo" lo comparten la equilibrada y la cómoda,
  // pero no la económica: sigue distinguiendo y no debe descartarse.
  it("una razón compartida por dos de tres sigue distinguiendo", () => {
    expect(pickDistinguishingReasons(EQUILIBRADA, TODAS)).toContain("El vuelo de ida es directo, sin escalas.");
  });

  // La comparativa enseña hasta 3 razones por fila, pero no rellena el hueco
  // con las comunes: una propuesta puede quedarse legítimamente con 2 (aquí
  // la económica) mientras la de al lado enseña 3. Una frase que sale igual
  // en las tres, puesta en una sola fila, se leería como un argumento propio
  // de esa opción sin serlo. Filas desiguales antes que dar a entender eso.
  it("una propuesta puede quedarse con menos razones que sus vecinas", () => {
    expect(pickDistinguishingReasons(ECONOMICA, TODAS)).toHaveLength(2);
    expect(pickDistinguishingReasons(COMODA, TODAS)).toHaveLength(4);
  });

  it("con una sola propuesta no descarta nada", () => {
    expect(pickDistinguishingReasons(ECONOMICA, [ECONOMICA])).toEqual(ECONOMICA);
  });

  it("no descarta nada si no hay con qué comparar", () => {
    expect(pickDistinguishingReasons(ECONOMICA, [])).toEqual(ECONOMICA);
  });

  it("si todas las razones son comunes, no deja ninguna distinguiendo", () => {
    expect(pickDistinguishingReasons(ECONOMICA, [ECONOMICA, ECONOMICA, ECONOMICA])).toEqual([]);
  });
});

// --- El adaptador ya no pierde razones ni avisos -------------------------

const SEARCH: SearchParams = {
  origin: "Madrid",
  destination: "Roma",
  departureDate: "2026-10-05",
  returnDate: "2026-10-09",
  travelers: 2,
  children: 0,
  budget: 2000,
  category: "equilibrado",
  preferences: [],
};

function backendProposal(
  type: BackendTripProposal["type"],
  reasons: string[],
  warnings: string[] = [],
): BackendTripProposal {
  return {
    type,
    score: 80,
    rank: 1,
    scoreBreakdown: {
      price: 50,
      accommodationQuality: 50,
      location: 50,
      transportComfort: 50,
      usableTime: 50,
      preferenceMatch: 50,
    },
    flight: {
      id: "f1",
      provider: "mock",
      totalPrice: 200,
      currency: "EUR",
      outbound: [
        {
          id: "s1",
          origin: "MAD",
          destination: "FCO",
          departureTime: "2026-10-05T08:00:00.000Z",
          arrivalTime: "2026-10-05T10:30:00.000Z",
          carrier: "IB",
          flightNumber: "IB1",
          durationMinutes: 150,
        },
      ],
      totalDurationMinutes: 150,
      stops: 0,
      baggageIncluded: true,
      refundable: false,
      fetchedAt: "2026-10-01T00:00:00.000Z",
    },
    accommodation: {
      id: `hotel-${type}`,
      provider: "mock",
      name: "Hotel",
      totalPrice: 400,
      currency: "EUR",
      rating: 4,
      latitude: 41.9,
      longitude: 12.5,
      amenities: [],
      capacity: 4,
      fetchedAt: "2026-10-01T00:00:00.000Z",
    },
    itinerary: [{ dayNumber: 1, date: "2026-10-05", items: [] }],
    budget: {
      mainTransportCost: 200,
      accommodationCost: 400,
      foodBudget: 300,
      activityCost: 200,
      localTransportCost: 100,
      insuranceCost: 24,
      emergencyReserve: 100,
      totalTripCost: 1324,
    },
    totalCost: 1324,
    costPerPerson: 662,
    evaluatedCombinations: 285,
    discardedCombinations: 263,
    reasons,
    warnings,
  };
}

function response(proposals: BackendTripProposal[], disclaimer?: string): GenerateTripResponse {
  return {
    id: "req-1",
    status: "generated",
    request: {},
    metadata: { evaluatedCombinations: 285, discardedCombinations: 263, cheapestTotalCost: 1000, disclaimer },
    proposals,
  };
}

// --- Lo que llegaba por la red y el adaptador tiraba -----------------------

type BackendItem = BackendTripProposal["itinerary"][number]["items"][number];

function visita(overrides: Partial<BackendItem> = {}): BackendItem {
  return {
    id: `v-${Math.random()}`,
    startTime: "2026-10-05T10:00:00.000Z",
    endTime: "2026-10-05T11:30:00.000Z",
    type: "visit",
    title: "Museo Nazionale Etrusco",
    preference: "culture",
    latitude: 41.918,
    longitude: 12.476,
    durationMinutes: 90,
    verificationStatus: "partial",
    ...overrides,
  };
}

function conItinerario(items: BackendItem[]): BackendTripProposal {
  return {
    ...backendProposal("economical", ECONOMICA),
    itinerary: [{ dayNumber: 1, date: "2026-10-05", items }],
  };
}

const primerDia = (proposal: BackendTripProposal) =>
  toSearchResult(response([proposal]), SEARCH).proposals[0].itinerary.days[0];

describe("toSearchResult · procedencia de los datos", () => {
  // El backend distingue "partial" (Overture: el sitio existe) de
  // "unverified" (mock: no existe) y el adaptador no miraba el campo, así
  // que un museo real y un sitio inventado se pintaban idénticos.
  it("marca como reales los sitios que vienen de un proveedor real", () => {
    const dia = primerDia(conItinerario([visita({ verificationStatus: "partial" })]));

    expect(dia.stops[0].verification).toBe("real");
    expect(dia.placesVerification).toBe("real");
  });

  it("marca como simulados los sitios inventados", () => {
    const dia = primerDia(conItinerario([visita({ verificationStatus: "unverified" })]));

    expect(dia.stops[0].verification).toBe("simulado");
    expect(dia.placesVerification).toBe("simulado");
  });

  // Basta una visita inventada para que "lugares reales" deje de ser cierto:
  // una etiqueta que miente a veces no sirve de nada.
  it("un solo sitio inventado tumba la etiqueta de día real", () => {
    const dia = primerDia(
      conItinerario([
        visita({ verificationStatus: "partial" }),
        visita({ verificationStatus: "unverified", startTime: "2026-10-05T16:00:00.000Z" }),
      ]),
    );

    expect(dia.placesVerification).toBe("simulado");
  });

  // El caso que costó un paso entero: OpenRouteService mide los paseos sobre
  // el callejero real y ni un minuto llegaba a la pantalla.
  it("lleva los minutos de desplazamiento y si son medidos o estimados", () => {
    const dia = primerDia(
      conItinerario([
        visita(),
        visita({
          startTime: "2026-10-05T16:00:00.000Z",
          travelMinutesFromPrevious: 49,
          transportMode: "walk",
          travelEstimated: false,
        }),
      ]),
    );

    expect(dia.stops[1].travelMinutes).toBe(49);
    expect(dia.stops[1].transportMode).toBe("walk");
    expect(dia.stops[1].travelEstimated).toBe(false);
  });

  // Entre el Coliseo y San Pedro la línea recta decía 10 minutos y la calle
  // real dice 49. Sin esta marca las dos cifras se pintan igual.
  it("distingue un tiempo estimado de uno medido", () => {
    const dia = primerDia(
      conItinerario([
        visita(),
        visita({ startTime: "2026-10-05T16:00:00.000Z", travelMinutesFromPrevious: 10, travelEstimated: true }),
      ]),
    );

    expect(dia.stops[1].travelEstimated).toBe(true);
  });

  // Overture guarda la web oficial de cada sitio y se quedaba en el campo
  // bookingUrl sin que nadie la enseñara. Es donde se comprueban la tarifa y
  // el horario, que nosotros solo estimamos.
  it("lleva la web oficial del sitio cuando el proveedor la tiene", () => {
    const dia = primerDia(conItinerario([visita({ bookingUrl: "https://museoetru.it" })]));

    expect(dia.stops[0].website).toBe("https://museoetru.it");
  });
});

describe("toTripProposal · ficha de alojamiento", () => {
  // Se derivaban estrellas de la propia valoración (3,8/5 -> ★★★) y se
  // pintaban al lado de ella: el mismo número dos veces, y el primero
  // disfrazado de una categoría hotelera que el backend no tiene.
  it("ya no inventa una categoría de estrellas a partir de la valoración", () => {
    const { hotel } = toSearchResult(response([backendProposal("economical", ECONOMICA)]), SEARCH).proposals[0];

    expect(hotel).not.toHaveProperty("stars");
    expect(hotel.rating).toBe(4);
  });

  // Tres datos que el motor ya calculaba y la ficha no enseñaba. La
  // cancelación gratuita solo aparecía cuando FALTABA, en los avisos.
  it("lleva la distancia al centro, la cancelación y el desayuno", () => {
    const base = backendProposal("economical", ECONOMICA);
    const proposal = {
      ...base,
      accommodation: { ...base.accommodation, distanceToCenterKm: 1.9, freeCancellation: true, breakfastIncluded: false },
    };

    const { hotel } = toSearchResult(response([proposal]), SEARCH).proposals[0];

    expect(hotel.distanceToCenterKm).toBe(1.9);
    expect(hotel.freeCancellation).toBe(true);
    expect(hotel.breakfastIncluded).toBe(false);
  });
});

describe("toSearchResult · razones y avisos", () => {
  it("ya no tira las razones ni los avisos del motor", () => {
    const result = toSearchResult(
      response([backendProposal("recommended", EQUILIBRADA, ["El equipaje facturado no está incluido."])]),
      SEARCH,
    );

    expect(result.proposals[0].reasons).toEqual(EQUILIBRADA);
    expect(result.proposals[0].warnings).toEqual(["El equipaje facturado no está incluido."]);
  });

  it("marca las razones que distinguen a cada propuesta", () => {
    const result = toSearchResult(
      response([
        backendProposal("economical", ECONOMICA),
        backendProposal("recommended", EQUILIBRADA),
        backendProposal("comfort", COMODA),
      ]),
      SEARCH,
    );

    for (const proposal of result.proposals) {
      expect(proposal.distinguishingReasons).not.toContain("La afinidad con la cultura y la gastronomía es alta.");
      expect(proposal.distinguishingReasons.length).toBeGreaterThan(0);
    }
  });

  it("lleva el descargo global una sola vez, fuera de las propuestas", () => {
    const aviso = "Datos simulados: vuelos, alojamiento y actividades son estimaciones.";
    const result = toSearchResult(
      response([backendProposal("economical", ECONOMICA)], aviso),
      SEARCH,
    );

    expect(result.disclaimer).toBe(aviso);
    expect(result.proposals[0].warnings).not.toContain(aviso);
  });

  it("aguanta una respuesta sin razones ni avisos", () => {
    const sinNada = { ...backendProposal("economical", []), reasons: undefined, warnings: undefined };
    const result = toSearchResult(
      response([sinNada as unknown as BackendTripProposal]),
      SEARCH,
    );

    expect(result.proposals[0].reasons).toEqual([]);
    expect(result.proposals[0].warnings).toEqual([]);
  });
});
