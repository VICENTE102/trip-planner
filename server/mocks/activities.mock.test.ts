import { describe, expect, it } from "vitest";
import type { PreferenceProfile } from "../types/trip.js";
import { ALL_PREFERENCES, dominantPreference } from "../utils/preferences.js";
import { generateMockActivities } from "./activities.mock.js";

const PREFERENCIAS: PreferenceProfile = {
  beach: 1,
  culture: 1,
  gastronomy: 1,
  nightlife: 1,
  nature: 1,
  shopping: 1,
  family: 1,
  relax: 1,
};

const generar = () =>
  generateMockActivities({
    destination: "Roma",
    center: { lat: 41.89, lng: 12.48 },
    preferences: PREFERENCIAS,
  });

describe("generateMockActivities", () => {
  it("marca cada actividad con una preferencia dominante", () => {
    for (const actividad of generar()) {
      expect(actividad.preference, `"${actividad.name}" se quedó sin preferencia`).toBeDefined();
    }
  });

  it("la preferencia concuerda con el perfil de afinidad de la actividad", () => {
    for (const actividad of generar()) {
      expect(actividad.preference).toBe(dominantPreference(actividad.profile));
      // Y esa preferencia es de verdad la de mayor afinidad, no una
      // cualquiera que se le haya escrito encima.
      const maximo = Math.max(...ALL_PREFERENCES.map((key) => actividad.profile[key]));
      expect(actividad.profile[actividad.preference!]).toBe(maximo);
    }
  });

  it("cubre las ocho preferencias, para que ningún tema se quede sin candidatas", () => {
    const cubiertas = new Set(generar().map((a) => a.preference));
    for (const key of ALL_PREFERENCES) {
      expect(cubiertas.has(key), `no se generó ninguna actividad de "${key}"`).toBe(true);
    }
  });

  it("sigue siendo determinista", () => {
    expect(generar().map((a) => a.id)).toEqual(generar().map((a) => a.id));
  });
});

describe("dominantPreference", () => {
  it("devuelve la preferencia de mayor nivel", () => {
    expect(dominantPreference({ ...PREFERENCIAS, culture: 3 })).toBe("culture");
  });

  it("devuelve undefined si no hay afinidad con nada", () => {
    const cero = Object.fromEntries(ALL_PREFERENCES.map((k) => [k, 0])) as PreferenceProfile;
    expect(dominantPreference(cero)).toBeUndefined();
  });

  it("con empate se queda con la primera del orden canónico", () => {
    const cero = Object.fromEntries(ALL_PREFERENCES.map((k) => [k, 0])) as PreferenceProfile;
    expect(dominantPreference({ ...cero, relax: 2, culture: 2 })).toBe("culture");
  });
});
