import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCacheTally,
  formatCacheTally,
  recordCacheHit,
  recordCacheMiss,
} from "./cache-stats.service.js";

describe("createCacheTally", () => {
  it("empieza a cero en las tres cachés", () => {
    const tally = createCacheTally();
    expect(tally.hits).toEqual({ geocoding: 0, places: 0, routes: 0 });
    expect(tally.misses).toEqual({ geocoding: 0, places: 0, routes: 0 });
  });

  // Se pasa como parámetro y no como variable de módulo porque una función de
  // Vercel puede atender dos peticiones a la vez en la misma instancia, y con
  // `await` por toda la cadena las dos se intercalan. Un contador compartido
  // daría un porcentaje que no describe a ninguno de los dos viajes.
  it("dos búsquedas simultáneas no se mezclan las cifras", () => {
    const roma = createCacheTally();
    const paris = createCacheTally();

    recordCacheHit(roma, "routes", 42);
    recordCacheMiss(paris, "routes", 7);

    expect(roma.hits.routes).toBe(42);
    expect(roma.misses.routes).toBe(0);
    expect(paris.hits.routes).toBe(0);
    expect(paris.misses.routes).toBe(7);
  });

  // Los proveedores simulados no consultan caché y las pruebas no tienen por
  // qué construir un recuento: pasar undefined no puede reventar nada.
  it("sin recuento no hace nada y no falla", () => {
    expect(() => recordCacheHit(undefined, "geocoding")).not.toThrow();
    expect(() => recordCacheMiss(undefined, "places", 3)).not.toThrow();
  });
});

describe("formatCacheTally", () => {
  it("resume la búsqueda con el porcentaje de cada caché", () => {
    const tally = createCacheTally();
    recordCacheHit(tally, "geocoding");
    recordCacheHit(tally, "places");
    recordCacheHit(tally, "routes", 42);
    recordCacheMiss(tally, "routes", 6);

    const linea = formatCacheTally(tally, "roma");

    expect(linea).toContain("[cache] roma");
    expect(linea).toContain("geocoding=1/1 (100%)");
    expect(linea).toContain("places=1/1 (100%)");
    expect(linea).toContain("routes=42/48 (88%)");
  });

  // Una caché que no se ha consultado no aporta nada a la línea: escribir
  // "places=0/0" invitaría a leerlo como un 0% de aciertos, que es lo
  // contrario de lo que pasó.
  it("omite las cachés que no se consultaron", () => {
    const tally = createCacheTally();
    recordCacheHit(tally, "geocoding");

    const linea = formatCacheTally(tally, "roma");

    expect(linea).toContain("geocoding=");
    expect(linea).not.toContain("routes=");
    expect(linea).not.toContain("places=");
  });

  it("una búsqueda sin ninguna consulta lo dice, en vez de quedarse en blanco", () => {
    expect(formatCacheTally(createCacheTally(), "roma")).toContain("sin consultas");
  });

  it("cuenta un fallo completo como 0%", () => {
    const tally = createCacheTally();
    recordCacheMiss(tally, "routes", 48);
    expect(formatCacheTally(tally, "paris")).toContain("routes=0/48 (0%)");
  });
});

// --- Que medir no pueda romper una búsqueda ---------------------------------

const incrementCacheStats = vi.hoisted(() => vi.fn());
vi.mock("../repositories/cache-stats.repository.js", () => ({ incrementCacheStats }));

const { reportCacheTally } = await import("./cache-stats.service.js");

describe("reportCacheTally", () => {
  beforeEach(() => {
    incrementCacheStats.mockReset();
  });

  it("guarda una fila por caché consultada", async () => {
    const tally = createCacheTally();
    recordCacheHit(tally, "geocoding");
    recordCacheHit(tally, "routes", 40);
    recordCacheMiss(tally, "routes", 8);

    await reportCacheTally(tally, "roma");

    expect(incrementCacheStats).toHaveBeenCalledWith([
      { cache: "geocoding", hits: 1, misses: 0 },
      { cache: "routes", hits: 40, misses: 8 },
    ]);
  });

  // Misma regla que el contador de gasto del Paso 8: saber si la caché
  // funciona no puede ser motivo para que alguien se quede sin viaje.
  it("si la tabla de estadísticas falla, la búsqueda sigue adelante", async () => {
    incrementCacheStats.mockRejectedValueOnce(new Error("Supabase caído"));
    const tally = createCacheTally();
    recordCacheHit(tally, "geocoding");

    await expect(reportCacheTally(tally, "roma")).resolves.toBeUndefined();
  });

  it("no llama a la base de datos si no se consultó ninguna caché", async () => {
    await reportCacheTally(createCacheTally(), "roma");
    expect(incrementCacheStats).not.toHaveBeenCalled();
  });
});
