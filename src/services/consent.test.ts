import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El módulo guarda los suscriptores en una variable de módulo, así que cada
// prueba parte de uno limpio.
async function loadConsent() {
  vi.resetModules();
  return import("./consent");
}

function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

describe("consentimiento", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
  });

  afterEach(() => vi.unstubAllGlobals());

  // Sin decisión no es lo mismo que rechazo: con lo primero hay que enseñar
  // el banner, con lo segundo no.
  it("empieza sin decisión", async () => {
    const { getConsent, hasAccepted } = await loadConsent();
    expect(getConsent()).toBeUndefined();
    expect(hasAccepted()).toBe(false);
  });

  it("recuerda que se aceptó", async () => {
    const { setConsent, getConsent, hasAccepted } = await loadConsent();
    setConsent("accepted");
    expect(getConsent()).toBe("accepted");
    expect(hasAccepted()).toBe(true);
  });

  it("recuerda que se rechazó, y rechazar no es aceptar", async () => {
    const { setConsent, getConsent, hasAccepted } = await loadConsent();
    setConsent("rejected");
    expect(getConsent()).toBe("rejected");
    expect(hasAccepted()).toBe(false);
  });

  it("permite volver a preguntar", async () => {
    const { setConsent, clearConsent, getConsent } = await loadConsent();
    setConsent("accepted");
    clearConsent();
    expect(getConsent()).toBeUndefined();
  });

  it("avisa a los suscriptores de cada cambio", async () => {
    const { setConsent, clearConsent, onConsentChange } = await loadConsent();
    const vistos: (string | undefined)[] = [];
    onConsentChange((state) => vistos.push(state));

    setConsent("accepted");
    setConsent("rejected");
    clearConsent();

    expect(vistos).toEqual(["accepted", "rejected", undefined]);
  });

  it("deja de avisar tras darse de baja", async () => {
    const { setConsent, onConsentChange } = await loadConsent();
    const vistos: unknown[] = [];
    const baja = onConsentChange((state) => vistos.push(state));

    setConsent("accepted");
    baja();
    setConsent("rejected");

    expect(vistos).toHaveLength(1);
  });

  // Safari en modo privado, almacenamiento deshabilitado, cuota llena. Nada
  // de eso puede romper la app, y ante la duda se trata como "no consintió".
  it("no lanza si localStorage falla, y no da por hecho el consentimiento", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    });

    const { getConsent, hasAccepted, setConsent, clearConsent } = await loadConsent();

    expect(() => setConsent("accepted")).not.toThrow();
    expect(() => clearConsent()).not.toThrow();
    expect(getConsent()).toBeUndefined();
    expect(hasAccepted()).toBe(false);
  });

  it("ignora un valor corrupto en almacenamiento", async () => {
    const storage = fakeLocalStorage();
    storage.setItem("cookie-consent", "quizas");
    vi.stubGlobal("localStorage", storage);

    const { getConsent } = await loadConsent();
    expect(getConsent()).toBeUndefined();
  });
});
