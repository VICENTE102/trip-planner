import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El servicio guarda en variables de módulo la caché en memoria y el
// proveedor ya resuelto, así que cada prueba necesita un módulo limpio.
async function loadService() {
  vi.resetModules();
  return import("./geocoding.service.js");
}

interface PeticionCapturada {
  url: URL;
}

function stubGeoapify(respuesta: unknown, peticiones: PeticionCapturada[]) {
  vi.stubGlobal("fetch", async (input: string | URL) => {
    peticiones.push({ url: new URL(String(input)) });
    return new Response(JSON.stringify(respuesta), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

const AMSTERDAM = {
  results: [{ lat: 52.3730796, lon: 4.8924534, formatted: "Ámsterdam, NH, Países Bajos", country_code: "nl" }],
};

describe("resolveCityCenter", () => {
  beforeEach(() => {
    vi.stubEnv("GEOAPIFY_API_KEY", "clave-de-prueba");
    // Sin Supabase configurado la caché de base de datos se salta sola, que
    // es justo lo que interesa aquí: probar el servicio, no el repositorio.
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Regresión: se consultaba a Geoapify con el texto tal cual lo escribió el
  // usuario mientras la clave de caché sí iba normalizada. Aparte de la
  // incoherencia, Geoapify resuelve "Ámsterdam" (con tilde) como NUEVA YORK.
  it("consulta al proveedor con el nombre normalizado, no con el texto crudo", async () => {
    const peticiones: PeticionCapturada[] = [];
    stubGeoapify(AMSTERDAM, peticiones);

    const { resolveCityCenter } = await loadService();
    await resolveCityCenter("Ámsterdam");

    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].url.searchParams.get("text")).toBe("amsterdam");
  });

  it("trata igual las variantes de un mismo nombre", async () => {
    for (const escrito of ["Ámsterdam", "amsterdam", "  ÁMSTERDAM  ", "Ámsterdam, Países Bajos"]) {
      const peticiones: PeticionCapturada[] = [];
      stubGeoapify(AMSTERDAM, peticiones);

      const { resolveCityCenter } = await loadService();
      await resolveCityCenter(escrito);

      expect(peticiones[0].url.searchParams.get("text"), `fallo con "${escrito}"`).toBe("amsterdam");
    }
  });

  it("devuelve las coordenadas del proveedor", async () => {
    stubGeoapify(AMSTERDAM, []);
    const { resolveCityCenter } = await loadService();

    const centro = await resolveCityCenter("Ámsterdam");
    expect(centro.lat).toBeCloseTo(52.373, 3);
    expect(centro.lng).toBeCloseTo(4.892, 3);
  });

  it("no vuelve a preguntar por un destino ya resuelto", async () => {
    const peticiones: PeticionCapturada[] = [];
    stubGeoapify(AMSTERDAM, peticiones);

    const { resolveCityCenter } = await loadService();
    await resolveCityCenter("Ámsterdam");
    await resolveCityCenter("amsterdam");

    expect(peticiones).toHaveLength(1);
  });

  // Un destino que no existe debe recordarse igualmente: si no, cada
  // búsqueda de una ciudad mal escrita gastaría una llamada, para siempre.
  it("recuerda también los no encontrados", async () => {
    const peticiones: PeticionCapturada[] = [];
    stubGeoapify({ results: [] }, peticiones);

    const { resolveCityCenter } = await loadService();
    await resolveCityCenter("Qwertyville");
    await resolveCityCenter("Qwertyville");

    expect(peticiones).toHaveLength(1);
  });

  it("cae al centro simulado sin romper la búsqueda cuando el proveedor falla", async () => {
    vi.stubGlobal("fetch", async () => new Response("Unauthorized", { status: 401 }));

    const { resolveCityCenter } = await loadService();
    const centro = await resolveCityCenter("Roma");

    expect(Number.isFinite(centro.lat)).toBe(true);
    expect(Number.isFinite(centro.lng)).toBe(true);
  });

  // Un fallo de red es temporal: cachearlo dejaría el destino roto hasta que
  // el proceso se reinicie.
  it("reintenta tras un fallo del proveedor en vez de cachearlo", async () => {
    let llamadas = 0;
    vi.stubGlobal("fetch", async () => {
      llamadas++;
      return new Response("Boom", { status: 500 });
    });

    const { resolveCityCenter } = await loadService();
    await resolveCityCenter("Roma");
    await resolveCityCenter("Roma");

    expect(llamadas).toBe(2);
  });

  it("usa el centro simulado y no llama a nadie si no hay clave configurada", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "");
    let llamadas = 0;
    vi.stubGlobal("fetch", async () => {
      llamadas++;
      return new Response("{}", { status: 200 });
    });

    const { resolveCityCenter } = await loadService();
    const centro = await resolveCityCenter("Roma");

    expect(llamadas).toBe(0);
    expect(Number.isFinite(centro.lat)).toBe(true);
  });

  it("es determinista sin clave: el mismo destino da siempre el mismo centro", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "");

    const primero = await (await loadService()).resolveCityCenter("Roma");
    const segundo = await (await loadService()).resolveCityCenter("Roma");

    expect(primero).toEqual(segundo);
  });
});
