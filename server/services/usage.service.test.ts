import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Doble del repositorio: el tope se prueba sin base de datos, controlando
// exactamente qué cuenta devuelve y si la consulta falla.
const readApiUsage = vi.fn<(provider: string) => Promise<number | undefined>>();
const incrementApiUsage = vi.fn<(provider: string) => Promise<number | undefined>>();

vi.mock("../repositories/usage.repository.js", () => ({
  readApiUsage: (provider: string) => readApiUsage(provider),
  incrementApiUsage: (provider: string) => incrementApiUsage(provider),
}));

const { DAILY_LIMITS, canCallProvider, recordProviderCall, resetUsageCache } = await import("./usage.service.js");

describe("canCallProvider", () => {
  beforeEach(() => {
    resetUsageCache();
    readApiUsage.mockReset();
    incrementApiUsage.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("deja pasar mientras se esté por debajo del tope", async () => {
    readApiUsage.mockResolvedValue(10);
    expect(await canCallProvider("geoapify")).toBe(true);
  });

  it("corta justo al alcanzar el tope", async () => {
    readApiUsage.mockResolvedValue(DAILY_LIMITS.geoapify);
    expect(await canCallProvider("geoapify")).toBe(false);
  });

  it("corta por encima del tope", async () => {
    readApiUsage.mockResolvedValue(DAILY_LIMITS.openrouteservice + 50);
    expect(await canCallProvider("openrouteservice")).toBe(false);
  });

  // Lo más importante del diseño: un contador roto no puede dejar la app sin
  // geocodificar ni sin rutas. Equivocarse por este lado cuesta unas llamadas
  // de más; por el otro, romper el producto entero.
  it("deja pasar si el contador no está disponible", async () => {
    readApiUsage.mockResolvedValue(undefined);
    expect(await canCallProvider("geoapify")).toBe(true);
  });

  it("deja pasar a un proveedor sin tope definido", async () => {
    readApiUsage.mockResolvedValue(999999);
    expect(await canCallProvider("proveedor-desconocido")).toBe(true);
    expect(readApiUsage).not.toHaveBeenCalled();
  });

  it("no consulta el contador en cada llamada", async () => {
    readApiUsage.mockResolvedValue(10);

    await canCallProvider("geoapify");
    await canCallProvider("geoapify");
    await canCallProvider("geoapify");

    expect(readApiUsage).toHaveBeenCalledTimes(1);
  });

  it("vuelve a consultar cuando caduca la memoria", async () => {
    vi.useFakeTimers();
    readApiUsage.mockResolvedValue(10);

    await canCallProvider("geoapify");
    vi.advanceTimersByTime(31_000);
    await canCallProvider("geoapify");

    expect(readApiUsage).toHaveBeenCalledTimes(2);
  });
});

describe("recordProviderCall", () => {
  beforeEach(() => {
    resetUsageCache();
    readApiUsage.mockReset();
    incrementApiUsage.mockReset();
  });

  it("incrementa el contador del proveedor", async () => {
    incrementApiUsage.mockResolvedValue(1);
    await recordProviderCall("geoapify");
    expect(incrementApiUsage).toHaveBeenCalledWith("geoapify");
  });

  // El contador remoto manda: si devuelve un número por encima del tope, la
  // siguiente comprobación debe cortar sin esperar a que caduque la memoria.
  it("corta en cuanto el contador remoto pasa el tope, sin releer", async () => {
    readApiUsage.mockResolvedValue(0);
    expect(await canCallProvider("geoapify")).toBe(true);

    incrementApiUsage.mockResolvedValue(DAILY_LIMITS.geoapify);
    await recordProviderCall("geoapify");

    expect(await canCallProvider("geoapify")).toBe(false);
    // Y no ha hecho falta volver a preguntar a la base de datos.
    expect(readApiUsage).toHaveBeenCalledTimes(1);
  });

  it("sigue contando en memoria si el incremento remoto falla", async () => {
    readApiUsage.mockResolvedValue(DAILY_LIMITS.geoapify - 1);
    expect(await canCallProvider("geoapify")).toBe(true);

    incrementApiUsage.mockResolvedValue(undefined);
    await recordProviderCall("geoapify");

    expect(await canCallProvider("geoapify")).toBe(false);
  });

  it("no lanza si el incremento falla", async () => {
    incrementApiUsage.mockResolvedValue(undefined);
    await expect(recordProviderCall("geoapify")).resolves.toBeUndefined();
  });
});
