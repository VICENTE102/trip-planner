import { describe, expect, it } from "vitest";
import { createOpenRouteServiceProvider } from "../providers/openrouteservice-routes.provider.js";
import { haversineDistanceKm } from "../utils/geo.js";

// Prueba de integración: sale a la red contra OpenRouteService.
//
//   npm run test:integration
//
// Fuera de `npm test` y de CI, igual que la de Geoapify: depende de un
// servicio ajeno y de una cuota. Su valor es comprobar que los tiempos que
// devuelve son creíbles, que es justo lo que no puede verificar un doble.

const apiKey = process.env.ORS_API_KEY?.trim();

// Tres puntos reales del centro de Roma, separados por el Tíber. Es el caso
// que mejor enseña por qué la línea recta no vale: el río solo se cruza por
// los puentes.
const COLISEO = { id: "coliseo", latitude: 41.8902, longitude: 12.4922 };
const VATICANO = { id: "vaticano", latitude: 41.9022, longitude: 12.4539 };
const PANTEON = { id: "panteon", latitude: 41.8986, longitude: 12.4769 };

describe.skipIf(!apiKey)("OpenRouteService · tiempos a pie en Roma (red real)", () => {
  const provider = createOpenRouteServiceProvider(apiKey ?? "");

  it("devuelve un tramo por cada par ordenado", async () => {
    const legs = await provider.calculateLegs([COLISEO, VATICANO, PANTEON]);
    expect(legs).toHaveLength(6);
  });

  it("andar siempre lleva más tiempo y más distancia que la línea recta", async () => {
    const legs = await provider.calculateLegs([COLISEO, VATICANO, PANTEON]);
    const puntos = new Map([COLISEO, VATICANO, PANTEON].map((p) => [p.id, p]));

    for (const leg of legs) {
      const from = puntos.get(leg.fromId)!;
      const to = puntos.get(leg.toId)!;
      const rectaKm = haversineDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);

      expect(
        leg.distanceKm,
        `${leg.fromId} -> ${leg.toId}: andando ${leg.distanceKm.toFixed(2)} km, en línea recta ${rectaKm.toFixed(2)} km`,
      ).toBeGreaterThanOrEqual(rectaKm);
    }
  });

  it("los tiempos son creíbles a pie (entre 3 y 7 km/h)", async () => {
    const legs = await provider.calculateLegs([COLISEO, VATICANO, PANTEON]);

    for (const leg of legs) {
      const kmh = leg.distanceKm / (leg.durationSeconds / 3600);
      expect(kmh, `${leg.fromId} -> ${leg.toId} da ${kmh.toFixed(1)} km/h`).toBeGreaterThan(3);
      expect(kmh, `${leg.fromId} -> ${leg.toId} da ${kmh.toFixed(1)} km/h`).toBeLessThan(7);
    }
  });

  // El motivo de todo el paso: si la ruta real coincidiera con la línea
  // recta, no habría nada que ganar sustituyendo la estimación.
  it("cruzar el Tíber cuesta más de lo que dice la línea recta", async () => {
    const [leg] = await provider.calculateLegs([COLISEO, VATICANO]);
    const rectaKm = haversineDistanceKm(
      COLISEO.latitude,
      COLISEO.longitude,
      VATICANO.latitude,
      VATICANO.longitude,
    );

    console.log(
      `Coliseo -> Vaticano: ${leg.distanceKm.toFixed(2)} km andando y ` +
        `${Math.round(leg.durationSeconds / 60)} min, frente a ${rectaKm.toFixed(2)} km en línea recta`,
    );
    expect(leg.distanceKm).toBeGreaterThan(rectaKm * 1.05);
  });
});
