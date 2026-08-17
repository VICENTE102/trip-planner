import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Doble de posthog-js: registra qué se captura sin salir a la red y sin
// cargar los 234 kB de la librería real.
const capturado: { event: string; props?: Record<string, unknown> }[] = [];
const init = vi.fn();
const optOut = vi.fn();
let importaciones = 0;
let fallaAlCargar = false;

vi.mock("posthog-js", () => {
  importaciones++;
  if (fallaAlCargar) throw new Error("bloqueado por un adblocker");
  return {
    default: {
      init,
      capture: (event: string, props?: Record<string, unknown>) => void capturado.push({ event, props }),
      opt_out_capturing: optOut,
    },
  };
});

function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

async function load() {
  vi.resetModules();
  const consent = await import("./consent");
  const analytics = await import("./analytics");
  return { ...consent, ...analytics };
}

// Deja que se resuelvan los import() dinámicos de dentro de track/init.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("analítica", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_pruebas");
    vi.stubGlobal("localStorage", fakeLocalStorage());
    capturado.length = 0;
    init.mockClear();
    optOut.mockClear();
    importaciones = 0;
    fallaAlCargar = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // La regla que no se puede romper. Si un refactor futuro la salta, se
  // estaría midiendo a gente que todavía no ha dicho que sí.
  it("no carga PostHog ni captura nada antes del consentimiento", async () => {
    const { track, initAnalytics } = await load();
    initAnalytics();

    track("formulario_iniciado");
    track("formulario_enviado", { destino: "Roma" });
    await settle();

    expect(importaciones, "no debería haberse importado la librería").toBe(0);
    expect(init).not.toHaveBeenCalled();
    expect(capturado).toEqual([]);
  });

  it("tampoco carga nada si el usuario rechaza", async () => {
    const { track, initAnalytics, setConsent } = await load();
    initAnalytics();
    setConsent("rejected");

    track("formulario_iniciado");
    await settle();

    expect(importaciones).toBe(0);
    expect(capturado).toEqual([]);
  });

  // Los primeros eventos del embudo ocurren mientras el banner sigue en
  // pantalla: sin cola se perderían justo los más interesantes.
  it("envía los eventos en cola cuando se acepta", async () => {
    const { track, initAnalytics, setConsent } = await load();
    initAnalytics();

    track("formulario_iniciado");
    track("formulario_enviado", { destino: "Roma" });
    expect(capturado).toEqual([]);

    setConsent("accepted");
    await settle();

    expect(capturado.map((c) => c.event)).toEqual(["formulario_iniciado", "formulario_enviado"]);
    expect(capturado[1].props).toEqual({ destino: "Roma" });
  });

  it("descarta la cola si se rechaza", async () => {
    const { track, initAnalytics, setConsent } = await load();
    initAnalytics();

    track("formulario_iniciado");
    setConsent("rejected");
    await settle();

    expect(capturado).toEqual([]);
  });

  it("captura directamente con el consentimiento ya dado de una visita anterior", async () => {
    const { initAnalytics, track, setConsent } = await load();
    setConsent("accepted");
    initAnalytics();
    await settle();

    track("pdf_descargado", { destino: "Roma" });
    await settle();

    expect(capturado.map((c) => c.event)).toContain("pdf_descargado");
  });

  it("deja de capturar si se revoca el consentimiento", async () => {
    const { initAnalytics, setConsent, clearConsent } = await load();
    setConsent("accepted");
    initAnalytics();
    await settle();

    clearConsent();
    await settle();

    expect(optOut).toHaveBeenCalled();
  });

  it("no inicializa PostHog más de una vez", async () => {
    const { initAnalytics, track, setConsent } = await load();
    setConsent("accepted");
    initAnalytics();
    await settle();

    track("formulario_iniciado");
    track("formulario_enviado");
    await settle();

    expect(init).toHaveBeenCalledTimes(1);
  });

  // Ninguna medición puede impedir que alguien descargue su PDF.
  it("no lanza si PostHog no se puede cargar", async () => {
    fallaAlCargar = true;
    const { initAnalytics, track, setConsent } = await load();
    setConsent("accepted");
    initAnalytics();
    await settle();

    expect(() => track("pdf_descargado")).not.toThrow();
    await settle();
  });

  it("no hace nada si no hay clave configurada", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "");
    const { initAnalytics, track, setConsent } = await load();
    setConsent("accepted");
    initAnalytics();

    track("formulario_iniciado");
    await settle();

    expect(init).not.toHaveBeenCalled();
    expect(capturado).toEqual([]);
  });

  it("no acumula eventos sin límite si nunca se decide", async () => {
    const { track, initAnalytics, queuedEventCountForTests } = await load();
    initAnalytics();

    for (let i = 0; i < 200; i++) track("pestana_vista", { i });

    expect(queuedEventCountForTests()).toBeLessThanOrEqual(50);
  });
});
