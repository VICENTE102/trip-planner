import { describe, expect, it } from "vitest";
import type { ActivityCandidate } from "../types/activity.js";
import type { ItineraryItem } from "../types/itinerary.js";
import type { TravelMatrixEntry } from "../types/route.js";
import type { PreferenceProfile } from "../types/trip.js";
import { detectOverlaps } from "./validate-trip.js";
import { isoMinutesOfDay, scheduleDayActivities } from "./schedule-itinerary.js";

const NO_PREFERENCES: PreferenceProfile = {
  beach: 0,
  culture: 0,
  gastronomy: 0,
  nightlife: 0,
  nature: 0,
  shopping: 0,
  family: 0,
  relax: 0,
};

const HOTEL = { id: "hotel-1", name: "Hotel de prueba", latitude: 41.9, longitude: 12.5 };
const DATE = "2026-10-06";

function activity(id: string, durationMinutes: number, overrides: Partial<ActivityCandidate> = {}): ActivityCandidate {
  return {
    id,
    name: `Actividad ${id}`,
    category: "cultura",
    profile: NO_PREFERENCES,
    latitude: 41.9,
    longitude: 12.5,
    estimatedDurationMinutes: durationMinutes,
    pricePerPerson: 10,
    verificationStatus: "unverified",
    ...overrides,
  };
}

function baseContext(overrides: Partial<Parameters<typeof scheduleDayActivities>[1]> = {}) {
  return {
    dayNumber: 2,
    date: DATE,
    dayOfWeek: 2,
    isArrivalDay: false,
    isDepartureDay: false,
    preferences: NO_PREFERENCES,
    travelLeg: () => undefined,
    hotel: HOTEL,
    ...overrides,
  };
}

// Un tramo de la matriz con los minutos y el modo que se quieran probar.
const leg =
  (travelMinutes: number, transportMode: TravelMatrixEntry["transportMode"] = "walk", estimated = false) =>
  (fromId: string, toId: string): TravelMatrixEntry => ({
    fromId,
    toId,
    distanceKm: travelMinutes / 12,
    travelMinutes,
    transportMode,
    estimated,
  });

const minutes = (item: ItineraryItem) => ({
  inicio: isoMinutesOfDay(item.startTime),
  fin: isoMinutesOfDay(item.endTime),
});

describe("scheduleDayActivities", () => {
  // Regresión: el ítem de desplazamiento se calculaba restando desde el
  // inicio de la visita, así que cuando se insertaba una pausa por delante,
  // el desplazamiento se quedaba sobre una base obsoleta y se solapaba con
  // ella. El arreglo fue llevar `travelStartMinutes` como variable propia.
  it("no solapa la pausa con el desplazamiento cuando se superan las 3 horas continuas", () => {
    // Tres visitas de 100 min encadenadas pasan de 180 min continuos en la
    // tercera, que es donde se fuerza la pausa. Con desplazamiento entre
    // ellas para que haya un ítem de viaje que pueda solaparse.
    const day = scheduleDayActivities(
      [activity("a", 100), activity("b", 100), activity("c", 100)],
      baseContext({ travelLeg: leg(20) }),
    );

    const pausa = day.items.find((item) => item.type === "free_time" && item.title === "Pausa");
    expect(pausa, "el día debería incluir una pausa tras 3 h continuas").toBeDefined();

    expect(detectOverlaps(day.items)).toEqual([]);
  });

  // Regresión: con una llegada entrada la tarde, el primer bloque de comida
  // del día se insertaba como "Comida" de 60 min y 20 €, aunque fueran las
  // 19:00 y lo que tocara de verdad fuese cenar.
  it("etiqueta como cena la primera comida cuando se llega entrada la tarde", () => {
    const day = scheduleDayActivities(
      [],
      baseContext({
        dayNumber: 1,
        isArrivalDay: true,
        arrivalTime: `${DATE}T19:00:00.000Z`,
      }),
    );

    const comidas = day.items.filter((item) => item.type === "meal");
    expect(comidas.length).toBeGreaterThan(0);

    const primera = comidas[0];
    expect(primera.title).toBe("Cena");
    expect(primera.durationMinutes).toBe(90);
    expect(primera.costPerPerson).toBe(35);
    // Y no debe colarse además un almuerzo a deshora.
    expect(comidas.filter((item) => item.title === "Comida")).toHaveLength(0);
  });

  it("mantiene comida y cena separadas en un día normal", () => {
    const day = scheduleDayActivities([activity("a", 90)], baseContext());
    const titulos = day.items.filter((item) => item.type === "meal").map((item) => item.title);
    expect(titulos).toEqual(["Comida", "Cena"]);
  });

  // Regresión: el traslado al aeropuerto se anclaba al final del día pero
  // el resto de bloques no respetaba ese límite, así que podían programarse
  // actividades (o el propio traslado) después de la salida del vuelo.
  it("no programa nada después del corte de traslado en el día de salida", () => {
    const departureMinutes = 11 * 60; // vuelo a las 11:00
    const day = scheduleDayActivities(
      [activity("a", 120), activity("b", 120)],
      baseContext({
        dayNumber: 5,
        isDepartureDay: true,
        departureTime: `${DATE}T11:00:00.000Z`,
      }),
    );

    const traslado = day.items.find((item) => item.type === "transfer");
    expect(traslado, "el día de salida debe incluir el traslado al aeropuerto").toBeDefined();

    const finTraslado = minutes(traslado!).fin;
    expect(finTraslado).toBeLessThanOrEqual(departureMinutes);

    // Nada, de ningún tipo, puede terminar después de que salga el vuelo.
    for (const item of day.items) {
      expect(minutes(item).fin, `"${item.title}" termina después de la salida`).toBeLessThanOrEqual(departureMinutes);
    }

    // Y el traslado tiene que ser lo último del día.
    const ultimoFin = Math.max(...day.items.map((item) => minutes(item).fin));
    expect(finTraslado).toBe(ultimoFin);
  });

  it("no deja solapamientos en un día cargado con esperas por horario de apertura", () => {
    const day = scheduleDayActivities(
      [
        activity("a", 90, {
          // Cierra pronto y abre tarde: fuerza el camino de nextOpeningMinutes,
          // que recoloca el desplazamiento por delante de la visita.
          openingHours: [{ dayOfWeek: 2, opensAt: "12:00", closesAt: "20:00" }],
        }),
        activity("b", 120),
        activity("c", 60),
      ],
      baseContext({ travelLeg: leg(25) }),
    );

    expect(detectOverlaps(day.items)).toEqual([]);
  });

  // La preferencia es lo único que llega a la interfaz para elegir la foto y
  // la etiqueta de la tarjeta del día. Si se pierde aquí, las tarjetas
  // vuelven al icono genérico y todos los días pasan a poner "Explora" — que
  // es exactamente como estaban antes de conectarla, y en silencio.
  it("conserva la preferencia del sitio en el ítem de visita", () => {
    const day = scheduleDayActivities(
      [activity("a", 90, { preference: "beach" }), activity("b", 60, { preference: "gastronomy" })],
      baseContext(),
    );

    const visitas = day.items.filter((item) => item.type === "visit");
    expect(visitas).toHaveLength(2);
    expect(visitas.map((item) => item.preference)).toEqual(["beach", "gastronomy"]);
  });

  it("deja la preferencia sin definir en lo que no es una visita", () => {
    const day = scheduleDayActivities([activity("a", 90, { preference: "culture" })], baseContext());
    for (const item of day.items.filter((i) => i.type !== "visit")) {
      expect(item.preference).toBeUndefined();
    }
  });

  // El modo lo decide routes.service.ts, que es quien sabe si un trayecto se
  // anda o si es demasiado largo y se estima en transporte. Si aquí solo
  // llegaran los minutos, un viaje en metro se guardaría como si fuera a pie
  // — el dato existiría en el backend y se perdería justo antes de la
  // interfaz, igual que pasó con la preferencia.
  it("conserva el modo de transporte en el ítem de desplazamiento", () => {
    const day = scheduleDayActivities(
      [activity("a", 60), activity("b", 60)],
      baseContext({ travelLeg: leg(28, "transit") }),
    );

    const desplazamientos = day.items.filter((item) => item.type === "walk");
    expect(desplazamientos.length).toBeGreaterThan(0);
    for (const item of desplazamientos) {
      expect(item.transportMode).toBe("transit");
    }
  });

  it("marca como a pie los trayectos que se andan", () => {
    const day = scheduleDayActivities(
      [activity("a", 60), activity("b", 60)],
      baseContext({ travelLeg: leg(12, "walk") }),
    );

    for (const item of day.items.filter((i) => i.type === "walk")) {
      expect(item.transportMode).toBe("walk");
    }
  });

  it("usa los minutos del tramo para colocar la visita siguiente", () => {
    const day = scheduleDayActivities(
      [activity("a", 60), activity("b", 60)],
      baseContext({ travelLeg: leg(30, "transit") }),
    );

    const desplazamiento = day.items.find((item) => item.type === "walk")!;
    expect(desplazamiento.durationMinutes).toBe(30);
    expect(desplazamiento.travelMinutesFromPrevious).toBe(30);
  });

  it("respeta el día completo cuando no es ni de llegada ni de salida", () => {
    const day = scheduleDayActivities([activity("a", 60)], baseContext());
    for (const item of day.items) {
      expect(minutes(item).inicio).toBeGreaterThanOrEqual(0);
      expect(minutes(item).fin).toBeLessThanOrEqual(24 * 60);
    }
  });
});
