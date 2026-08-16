import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutePlace } from "../types/route.js";

// El servicio cachea el proveedor en una variable de módulo, así que cada
// prueba necesita un módulo limpio.
async function loadService() {
  vi.resetModules();
  return import("./routes.service.js");
}

// Dos puntos del centro de Roma, a poco más de 2 km en línea recta.
const HOTEL: RoutePlace = { id: "hotel", latitude: 41.8933, longitude: 12.4829 };
const MUSEO: RoutePlace = { id: "museo", latitude: 41.9022, longitude: 12.4539 };
const LEJOS: RoutePlace = { id: "lejos", latitude: 41.7, longitude: 12.3 };

interface Peticion {
  body: Record<string, unknown>;
}

function stubOrs(durations: (number | null)[][], distances: (number | null)[][], peticiones: Peticion[]) {
  vi.stubGlobal("fetch", async (_input: string | URL, init?: RequestInit) => {
    peticiones.push({ body: JSON.parse(String(init?.body ?? "{}")) });
    return new Response(JSON.stringify({ durations, distances }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

const entrada = <T extends { fromId: string; toId: string }>(entries: T[], fromId: string, toId: string) =>
  entries.find((e) => e.fromId === fromId && e.toId === toId);

describe("resolveTravelMatrix", () => {
  beforeEach(() => {
    vi.stubEnv("ORS_API_KEY", "clave-de-prueba");
    // Sin Supabase, la caché se salta sola: aquí interesa el servicio.
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("usa los tiempos reales de ORS cuando están disponibles", async () => {
    // 1.800 s = 30 min andando entre hotel y museo.
    stubOrs([[0, 1800], [1500, 0]], [[0, 2.4], [2.4, 0]], []);

    const { resolveTravelMatrix } = await loadService();
    const matriz = await resolveTravelMatrix([HOTEL, MUSEO]);

    const ida = entrada(matriz, "hotel", "museo")!;
    expect(ida.travelMinutes).toBe(30);
    expect(ida.transportMode).toBe("walk");
    expect(ida.distanceKm).toBe(2.4);
  });

  it("respeta el sentido: ida y vuelta pueden durar distinto", async () => {
    stubOrs([[0, 1800], [1500, 0]], [[0, 2.4], [2.4, 0]], []);

    const { resolveTravelMatrix } = await loadService();
    const matriz = await resolveTravelMatrix([HOTEL, MUSEO]);

    expect(entrada(matriz, "hotel", "museo")!.travelMinutes).toBe(30);
    expect(entrada(matriz, "museo", "hotel")!.travelMinutes).toBe(25);
  });

  // ORS no tiene transporte público: por encima del tope, andar deja de ser
  // un plan y se estima el transporte.
  it("cambia a transporte cuando andar pasa del tope", async () => {
    // 7.200 s = 120 min andando, muy por encima de los 45 de tope.
    stubOrs([[0, 7200], [7200, 0]], [[0, 22], [22, 0]], []);

    const { resolveTravelMatrix } = await loadService();
    const matriz = await resolveTravelMatrix([HOTEL, LEJOS]);

    const ida = entrada(matriz, "hotel", "lejos")!;
    expect(ida.transportMode).toBe("transit");
    expect(ida.travelMinutes).toBeLessThan(120);
  });

  // El respaldo se calcula sobre la distancia REAL por calle, no sobre la
  // línea recta. Con la línea recta a 20 km/h, el Coliseo y la Basílica de
  // San Pedro salían a 10 minutos: convertir un 49 real en un 10 inventado
  // era peor que no tener respaldo.
  it("estima el transporte con la distancia real, no con la línea recta", async () => {
    // 4,08 km reales por calle entre dos puntos que en línea recta son 3,44.
    // 8 min de acceso + 4,08/18 h = 8 + 13,6 -> 22 min.
    stubOrs([[0, 3000], [3000, 0]], [[0, 4.08], [4.08, 0]], []);

    const { resolveTravelMatrix } = await loadService();
    const ida = entrada(await resolveTravelMatrix([HOTEL, LEJOS]), "hotel", "lejos")!;

    expect(ida.transportMode).toBe("transit");
    expect(ida.travelMinutes).toBe(22);
    // Y la distancia que se conserva es la real, no la de la línea recta.
    expect(ida.distanceKm).toBe(4.08);
  });

  it("no propone transporte si sale peor que ir andando", async () => {
    // 46 min andando (pasa el tope por poco) pero 20 km de recorrido: la
    // estimación de transporte daría 75 min, así que gana andar.
    stubOrs([[0, 2760], [2760, 0]], [[0, 20], [20, 0]], []);

    const { resolveTravelMatrix } = await loadService();
    const ida = entrada(await resolveTravelMatrix([HOTEL, LEJOS]), "hotel", "lejos")!;

    expect(ida.transportMode).toBe("walk");
    expect(ida.travelMinutes).toBe(46);
  });

  it("justo en el tope se sigue andando", async () => {
    // 2.700 s = 45 min exactos.
    stubOrs([[0, 2700], [2700, 0]], [[0, 3.5], [3.5, 0]], []);

    const { resolveTravelMatrix } = await loadService();
    const ida = entrada(await resolveTravelMatrix([HOTEL, LEJOS]), "hotel", "lejos")!;

    expect(ida.transportMode).toBe("walk");
    expect(ida.travelMinutes).toBe(45);
  });

  it("pide UNA sola matriz para todos los puntos", async () => {
    const peticiones: Peticion[] = [];
    stubOrs(
      [[0, 600, 900], [600, 0, 700], [900, 700, 0]],
      [[0, 0.8, 1.2], [0.8, 0, 0.9], [1.2, 0.9, 0]],
      peticiones,
    );

    const { resolveTravelMatrix } = await loadService();
    await resolveTravelMatrix([HOTEL, MUSEO, { id: "otro", latitude: 41.895, longitude: 12.48 }]);

    expect(peticiones).toHaveLength(1);
    expect((peticiones[0].body.locations as unknown[]).length).toBe(3);
  });

  it("cae a la estimación en línea recta si ORS falla, sin romper la búsqueda", async () => {
    vi.stubGlobal("fetch", async () => new Response("Boom", { status: 500 }));

    const { resolveTravelMatrix } = await loadService();
    const matriz = await resolveTravelMatrix([HOTEL, MUSEO]);

    expect(matriz).toHaveLength(2);
    for (const entry of matriz) {
      expect(entry.travelMinutes).toBeGreaterThan(0);
    }
  });

  it("no llama a ORS si no hay clave configurada", async () => {
    vi.stubEnv("ORS_API_KEY", "");
    let llamadas = 0;
    vi.stubGlobal("fetch", async () => {
      llamadas++;
      return new Response("{}", { status: 200 });
    });

    const { resolveTravelMatrix } = await loadService();
    const matriz = await resolveTravelMatrix([HOTEL, MUSEO]);

    expect(llamadas).toBe(0);
    expect(matriz).toHaveLength(2);
  });

  it("devuelve una entrada por cada par ordenado", async () => {
    stubOrs(
      [[0, 600, 900], [600, 0, 700], [900, 700, 0]],
      [[0, 0.8, 1.2], [0.8, 0, 0.9], [1.2, 0.9, 0]],
      [],
    );

    const { resolveTravelMatrix } = await loadService();
    const matriz = await resolveTravelMatrix([HOTEL, MUSEO, { id: "otro", latitude: 41.895, longitude: 12.48 }]);

    expect(matriz).toHaveLength(6); // 3 puntos -> 3x2 pares ordenados
    expect(matriz.some((e) => e.fromId === e.toId)).toBe(false);
  });

  // Paso 8: con el tope diario agotado se estima en línea recta en vez de
  // gastar la cuota de ORS.
  it("no llama a ORS si se ha agotado el tope diario", async () => {
    let llamadas = 0;
    vi.stubGlobal("fetch", async () => {
      llamadas++;
      return new Response(JSON.stringify({ durations: [[0, 600], [600, 0]], distances: [[0, 1], [1, 0]] }), { status: 200 });
    });
    vi.doMock("../repositories/usage.repository.js", () => ({
      readApiUsage: async () => 100000,
      incrementApiUsage: async () => 100001,
    }));

    const { resolveTravelMatrix } = await loadService();
    const matriz = await resolveTravelMatrix([HOTEL, MUSEO]);

    expect(llamadas).toBe(0);
    expect(matriz).toHaveLength(2);
    for (const entry of matriz) expect(entry.travelMinutes).toBeGreaterThan(0);
    vi.doUnmock("../repositories/usage.repository.js");
  });

  it("no llama a ORS con menos de dos puntos", async () => {
    let llamadas = 0;
    vi.stubGlobal("fetch", async () => {
      llamadas++;
      return new Response("{}", { status: 200 });
    });

    const { resolveTravelMatrix } = await loadService();
    expect(await resolveTravelMatrix([HOTEL])).toEqual([]);
    expect(llamadas).toBe(0);
  });
});

describe("clave de caché", () => {
  it("redondea las coordenadas a 5 decimales para que el mismo sitio comparta fila", async () => {
    const { routeKey, roundCoordinate } = await import("../repositories/routes.repository.js");

    expect(roundCoordinate(41.89332031)).toBe(41.89332);
    expect(routeKey("foot-walking", { latitude: 41.8933203, longitude: 12.4829321 }, { latitude: 41.9, longitude: 12.45 })).toBe(
      routeKey("foot-walking", { latitude: 41.8933199, longitude: 12.4829324 }, { latitude: 41.9, longitude: 12.45 }),
    );
  });

  it("distingue el sentido del trayecto", async () => {
    const { routeKey } = await import("../repositories/routes.repository.js");
    const a = { latitude: 41.89, longitude: 12.48 };
    const b = { latitude: 41.9, longitude: 12.45 };

    expect(routeKey("foot-walking", a, b)).not.toBe(routeKey("foot-walking", b, a));
  });
});
