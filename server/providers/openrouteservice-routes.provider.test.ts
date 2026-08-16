import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoutePlace } from "../types/route.js";
import { createOpenRouteServiceProvider } from "./openrouteservice-routes.provider.js";

const ROMA: RoutePlace = { id: "roma", latitude: 41.8933, longitude: 12.4829 };
const VATICANO: RoutePlace = { id: "vaticano", latitude: 41.9022, longitude: 12.4539 };

interface Capturada {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function stubOrs(respuesta: unknown, capturadas: Capturada[], status = 200) {
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    capturadas.push({
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    return new Response(JSON.stringify(respuesta), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

const MATRIZ_2X2 = {
  durations: [
    [0, 1800],
    [1750, 0],
  ],
  distances: [
    [0, 2.4],
    [2.4, 0],
  ],
};

describe("createOpenRouteServiceProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  // ORS espera [longitud, latitud], al revés de como se leen y se guardan en
  // el resto del proyecto. Invertirlo no da ningún error: manda la consulta a
  // otro punto del planeta y devuelve tiempos absurdos, o ninguna ruta.
  it("envía las coordenadas como [longitud, latitud]", async () => {
    const capturadas: Capturada[] = [];
    stubOrs(MATRIZ_2X2, capturadas);

    await createOpenRouteServiceProvider("clave").calculateLegs([ROMA, VATICANO]);

    expect(capturadas).toHaveLength(1);
    expect(capturadas[0].body.locations).toEqual([
      [12.4829, 41.8933],
      [12.4539, 41.9022],
    ]);
  });

  it("pide el perfil a pie con duración y distancia en kilómetros", async () => {
    const capturadas: Capturada[] = [];
    stubOrs(MATRIZ_2X2, capturadas);

    await createOpenRouteServiceProvider("clave").calculateLegs([ROMA, VATICANO]);

    expect(capturadas[0].url).toBe("https://api.openrouteservice.org/v2/matrix/foot-walking");
    expect(capturadas[0].body.metrics).toEqual(["duration", "distance"]);
    expect(capturadas[0].body.units).toBe("km");
    expect(capturadas[0].headers.Authorization).toBe("clave");
  });

  it("convierte la matriz en tramos, sin la diagonal", async () => {
    stubOrs(MATRIZ_2X2, []);
    const legs = await createOpenRouteServiceProvider("clave").calculateLegs([ROMA, VATICANO]);

    expect(legs).toHaveLength(2);
    expect(legs).toContainEqual({ fromId: "roma", toId: "vaticano", durationSeconds: 1800, distanceKm: 2.4 });
    expect(legs).toContainEqual({ fromId: "vaticano", toId: "roma", durationSeconds: 1750, distanceKm: 2.4 });
  });

  // ORS devuelve null cuando no encuentra ruta entre dos puntos. Ese par se
  // omite para que quien llama lo estime, en vez de colarse como 0 minutos.
  it("omite los pares que ORS no sabe resolver", async () => {
    stubOrs(
      { durations: [[0, null], [1750, 0]], distances: [[0, null], [2.4, 0]] },
      [],
    );
    const legs = await createOpenRouteServiceProvider("clave").calculateLegs([ROMA, VATICANO]);

    expect(legs).toHaveLength(1);
    expect(legs[0].fromId).toBe("vaticano");
  });

  it("lanza si la respuesta no es correcta", async () => {
    stubOrs({ error: "cuota agotada" }, [], 429);
    await expect(createOpenRouteServiceProvider("clave").calculateLegs([ROMA, VATICANO])).rejects.toThrow(/429/);
  });

  it("lanza si la matriz llega sin durations o sin distances", async () => {
    stubOrs({ durations: [[0, 10]] }, []);
    await expect(createOpenRouteServiceProvider("clave").calculateLegs([ROMA, VATICANO])).rejects.toThrow(/distances/);
  });

  it("no llama a nadie con menos de dos puntos", async () => {
    const capturadas: Capturada[] = [];
    stubOrs(MATRIZ_2X2, capturadas);

    expect(await createOpenRouteServiceProvider("clave").calculateLegs([ROMA])).toEqual([]);
    expect(capturadas).toHaveLength(0);
  });

  it("se niega a pedir una matriz por encima del límite de ORS", async () => {
    const muchos = Array.from({ length: 51 }, (_, i) => ({ id: `p${i}`, latitude: 41.9 + i / 1000, longitude: 12.5 }));
    await expect(createOpenRouteServiceProvider("clave").calculateLegs(muchos)).rejects.toThrow(/máximo/);
  });
});
