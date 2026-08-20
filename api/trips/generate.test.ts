import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItineraryDay } from "../../server/types/itinerary.js";
import type { TripProposal } from "../../server/types/trip.js";
import { detectOverlaps } from "../../server/algorithms/validate-trip.js";
import handler from "./generate.js";

// Prueba de extremo a extremo del endpoint, sin red y sin claves.
//
// Sin SUPABASE_URL ni GEOAPIFY_API_KEY, la cadena entera se resuelve con los
// proveedores simulados: geocodificación al mock determinista, actividades al
// MockPlacesProvider y persistencia a no-op. Y los mocks van sembrados con
// mulberry32, así que la misma petición siempre da el mismo viaje.

interface RespuestaCapturada {
  statusCode: number;
  payload: Record<string, unknown>;
}

function fakeRes() {
  const captured: RespuestaCapturada = { statusCode: 0, payload: {} };
  const res = {
    statusCode: 0,
    setHeader: () => res,
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(payload: Record<string, unknown>) {
      captured.payload = payload;
      return res;
    },
    end: () => res,
  };
  return { res, captured };
}

const PETICION = {
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

async function generar(body: unknown, method = "POST") {
  const { res, captured } = fakeRes();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await handler({ method, body } as any, res as any);
  return captured;
}

describe("POST /api/trips/generate", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("GEOAPIFY_API_KEY", "");
    vi.stubEnv("ORS_API_KEY", "");
  });

  // La suite tiene que seguir siendo hermética: si alguna clave se colara,
  // CI empezaría a depender de servicios externos y a fallar por caídas
  // ajenas. Esta prueba vigila que una generación completa no toque la red.
  it("no sale a la red en ningún momento", async () => {
    let llamadas = 0;
    vi.stubGlobal("fetch", async () => {
      llamadas++;
      return new Response("{}", { status: 200 });
    });

    await generar(PETICION);
    expect(llamadas).toBe(0);
    vi.unstubAllGlobals();
  });

  it("devuelve 201 y hasta tres propuestas", async () => {
    const { statusCode, payload } = await generar(PETICION);

    expect(statusCode).toBe(201);
    const proposals = payload.proposals as TripProposal[];
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.length).toBeLessThanOrEqual(3);
  });

  // El orden de la respuesta es por tipo (económica, recomendada, cómoda),
  // que es como las pinta la pantalla de resultados. `rank` es otra cosa: la
  // posición por puntuación, y por eso no tiene por qué ir en orden aquí.
  it("da un tipo distinto por propuesta y un rank único a cada una", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];

    const tipos = proposals.map((p) => p.type);
    expect(new Set(tipos).size).toBe(tipos.length);
    expect(tipos).toEqual(["economical", "recommended", "comfort"].filter((t) => tipos.includes(t as never)));

    const ranks = proposals.map((p) => p.rank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(Array.from({ length: ranks.length }, (_, i) => i + 1));
  });

  it("la propuesta de rank 1 es la de mayor puntuación", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    const mejorPorScore = [...proposals].sort((a, b) => b.score - a.score)[0];
    expect(mejorPorScore.rank).toBe(1);
  });

  it("ninguna propuesta se pasa del presupuesto", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    for (const p of proposals) {
      expect(p.totalCost, `${p.type} se pasa del presupuesto`).toBeLessThanOrEqual(PETICION.budget);
    }
  });

  it("el coste total cuadra con la suma de su desglose", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    for (const p of proposals) {
      const suma =
        p.budget.mainTransportCost +
        p.budget.accommodationCost +
        p.budget.foodBudget +
        p.budget.activityCost +
        p.budget.localTransportCost +
        p.budget.insuranceCost +
        p.budget.emergencyReserve;
      expect(p.budget.totalTripCost).toBeCloseTo(suma, 1);
    }
  });

  it("cada itinerario tiene un día por día de viaje, numerados en orden", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    for (const p of proposals) {
      expect(p.itinerary).toHaveLength(5); // 5 y 9 de octubre, ambos incluidos
      expect(p.itinerary.map((d: ItineraryDay) => d.dayNumber)).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("ningún día tiene bloques solapados", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    for (const p of proposals) {
      for (const dia of p.itinerary) {
        expect(detectOverlaps(dia.items), `día ${dia.dayNumber} de ${p.type} tiene solapamientos`).toEqual([]);
      }
    }
  });

  it("ningún día programa más de 3 visitas", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    for (const p of proposals) {
      for (const dia of p.itinerary) {
        expect(dia.items.filter((i) => i.type === "visit").length).toBeLessThanOrEqual(3);
      }
    }
  });

  // La cadena preferencia -> foto de la tarjeta se rompió una vez en
  // silencio: el campo no llegaba al ItineraryItem, las tarjetas caían al
  // icono genérico y todos los días ponían "Explora". Nada fallaba, solo se
  // veía peor. Esta prueba vigila el extremo del que depende la interfaz.
  it("toda visita llega con su preferencia, que es lo que elige la foto del día", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    const preferenciasValidas = ["beach", "culture", "gastronomy", "nightlife", "nature", "shopping", "family", "relax"];

    let visitas = 0;
    for (const p of proposals) {
      for (const dia of p.itinerary) {
        for (const item of dia.items.filter((i) => i.type === "visit")) {
          visitas++;
          expect(item.preference, `"${item.title}" llegó sin preferencia`).toBeDefined();
          expect(preferenciasValidas).toContain(item.preference);
        }
      }
    }
    expect(visitas, "el viaje de prueba debería tener visitas que comprobar").toBeGreaterThan(0);
  });

  // El invariante que el usuario lee primero en la comparativa. Antes se
  // rompía: "Económico 1138€" encima de "Equilibrado 1118€".
  it("las propuestas van de menos a más precio", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    const costes = proposals.map((p) => p.totalCost);
    expect(costes, `orden roto: ${costes.join(" → ")}`).toEqual([...costes].sort((a, b) => a - b));
  });

  // "En precio y en nivel". El nivel se mide en la misma escala compuesta
  // con la que se eligen: alojamiento, ubicación y transporte.
  it("el nivel tampoco baja al subir de categoría", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    const W = { accommodationQuality: 0.35, location: 0.25, transportComfort: 0.25, usableTime: 0.05, preferenceMatch: 0.1 };
    const niveles = proposals.map((p) =>
      (Object.keys(W) as (keyof typeof W)[]).reduce((t, k) => t + p.scoreBreakdown[k] * W[k], 0),
    );
    expect(niveles.map((n) => Math.round(n))).toEqual([...niveles].sort((a, b) => a - b).map((n) => Math.round(n)));
  });

  it("cada propuesta trae su propio itinerario", async () => {
    const proposals = (await generar(PETICION)).payload.proposals as TripProposal[];
    const firmas = proposals.map((p) =>
      p.itinerary
        .flatMap((d) => d.items)
        .filter((i) => i.type === "visit")
        .map((i) => i.title)
        .sort()
        .join("|"),
    );
    expect(new Set(firmas).size, "las tres propuestas comparten itinerario").toBe(proposals.length);
  });

  // El síntoma que se notaba con datos simulados: poner 3.000 € y recibir
  // los mismos hoteles baratos que con 1.500 €.
  it("con más presupuesto, la propuesta cómoda gasta más", async () => {
    const pobre = (await generar({ ...PETICION, budget: 1200 })).payload.proposals as TripProposal[];
    const rica = (await generar({ ...PETICION, budget: 3000 })).payload.proposals as TripProposal[];

    const masCara = (ps: TripProposal[]) => Math.max(...ps.map((p) => p.totalCost));
    expect(masCara(rica)).toBeGreaterThan(masCara(pobre));
  });

  it("es determinista: la misma petición da el mismo resultado", async () => {
    const primera = (await generar(PETICION)).payload.proposals as TripProposal[];
    const segunda = (await generar(PETICION)).payload.proposals as TripProposal[];
    expect(segunda.map((p) => p.totalCost)).toEqual(primera.map((p) => p.totalCost));
  });

  // Criterio de éxito de la guía: con un presupuesto ridículo la app debe
  // decir cuánto falta, no inventarse un viaje.
  it("con un presupuesto imposible devuelve 0 propuestas y cuánto costaría", async () => {
    const { statusCode, payload } = await generar({ ...PETICION, budget: 50 });

    expect(statusCode).toBe(201);
    expect(payload.proposals).toEqual([]);
    const metadata = payload.metadata as { cheapestTotalCost: number | null };
    expect(metadata.cheapestTotalCost).not.toBeNull();
    expect(metadata.cheapestTotalCost!).toBeGreaterThan(50);
  });

  it("rechaza con 400 una petición con las fechas al revés", async () => {
    const { statusCode, payload } = await generar({ ...PETICION, returnDate: "2026-10-01" });

    expect(statusCode).toBe(400);
    const error = payload.error as { code: string; issues: { path: string }[] };
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.issues.map((i) => i.path)).toContain("returnDate");
  });

  it("rechaza con 405 cualquier método que no sea POST", async () => {
    const { statusCode, payload } = await generar(PETICION, "GET");
    expect(statusCode).toBe(405);
    expect((payload.error as { code: string }).code).toBe("METHOD_NOT_ALLOWED");
  });
});
