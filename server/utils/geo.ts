import { createSeededRandom, hashString } from "./random.js";

export interface FakeCoordinates {
  lat: number;
  lng: number;
}

// Coordenadas de centro ficticias por destino. No son geolocalización real
// (eso llegará con Google Places, sección 14/Fase 10) — solo sirven para
// que los alojamientos y actividades simulados de un mismo destino se
// agrupen de forma coherente entre sí.
export function fakeCityCenter(destination: string): FakeCoordinates {
  const random = createSeededRandom(hashString(`center-${destination}`));
  return {
    lat: 36 + random() * 20, // rango aproximado de latitudes europeas
    lng: -9 + random() * 35, // rango aproximado de longitudes europeas
  };
}

export function jitterCoordinates(center: FakeCoordinates, random: () => number, spread: number): FakeCoordinates {
  return {
    lat: center.lat + (random() - 0.5) * spread,
    lng: center.lng + (random() - 0.5) * spread,
  };
}
