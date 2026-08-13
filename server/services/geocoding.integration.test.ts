import { describe, expect, it } from "vitest";
import { createGeoapifyGeocodingProvider } from "../providers/geoapify-geocoding.provider.js";
import { normalizeCityName } from "../utils/text.js";

// Prueba de integración: sale a la red de verdad contra Geoapify.
//
//   npm run test:integration
//
// Queda FUERA de `npm test` y de CI a propósito. Depende de un servicio
// ajeno y de una cuota: una caída suya no debe poner el repositorio en rojo.
// Su valor es otro — es la única que detecta que Geoapify empiece a resolver
// mal una ciudad, que fue exactamente lo que pasó con "Ámsterdam" (devolvía
// Nueva York). Conviene ejecutarla al añadir destinos nuevos.

const apiKey = process.env.GEOAPIFY_API_KEY?.trim();

// Los destinos cargados y sus coordenadas conocidas.
//
// La lista se repite aquí en vez de importarla de scripts/destinations.ts a
// propósito: scripts/ es un proyecto TypeScript aparte (importa con extensión
// .ts real, que server/ no admite) y cruzarlos rompería `tsc -b`.
// AL AÑADIR UN DESTINO NUEVO A scripts/destinations.ts, AÑÁDELO TAMBIÉN AQUÍ.
//
// Las coordenadas no salen de Geoapify: son las que cualquiera puede
// comprobar en un mapa, que es lo que las hace útiles como referencia
// independiente del propio servicio que estamos verificando.
const DESTINOS: { nombre: string; lat: number; lng: number }[] = [
  { nombre: "Roma", lat: 41.89, lng: 12.48 },
  { nombre: "Barcelona", lat: 41.38, lng: 2.18 },
  { nombre: "París", lat: 48.86, lng: 2.35 },
  { nombre: "Lisboa", lat: 38.71, lng: -9.14 },
  { nombre: "Ámsterdam", lat: 52.37, lng: 4.89 },
  { nombre: "Praga", lat: 50.09, lng: 14.42 },
  { nombre: "Berlín", lat: 52.52, lng: 13.4 },
  { nombre: "Viena", lat: 48.21, lng: 16.37 },
  { nombre: "Florencia", lat: 43.77, lng: 11.26 },
  { nombre: "Oporto", lat: 41.15, lng: -8.61 },
];

const TOLERANCIA_KM = 25;

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

describe.skipIf(!apiKey)("Geoapify · destinos cargados (red real)", () => {
  const provider = createGeoapifyGeocodingProvider(apiKey ?? "");

  for (const destino of DESTINOS) {
    const clave = normalizeCityName(destino.nombre);

    it(`"${destino.nombre}" resuelve donde debe`, async () => {
      // Se consulta con el nombre normalizado, igual que hace el servicio.
      const resultado = await provider.geocodeCity(clave);
      expect(resultado, `Geoapify no encontró "${clave}"`).toBeDefined();

      const distancia = distanciaKm(resultado!.coordinates, destino);
      expect(
        distancia,
        `${destino.nombre} resolvió a ${resultado!.coordinates.lat.toFixed(4)}, ` +
          `${resultado!.coordinates.lng.toFixed(4)} (${resultado!.formattedName ?? "sin nombre"}), ` +
          `a ${distancia.toFixed(0)} km de donde debería`,
      ).toBeLessThan(TOLERANCIA_KM);
    });
  }
});
