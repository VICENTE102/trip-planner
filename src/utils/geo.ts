import { createSeededRandom, hashString } from "./random";

export interface FakeCoordinates {
  lat: number;
  lng: number;
}

// Coordenadas de centro ficticias por destino, igual que server/utils/geo.ts
// (no son geolocalización real — eso llegará con Google Places). Solo sirven
// para pintar algo coherente en el mapa de "Día a día" mientras se valida el
// diseño; cuando se conecte el backend real, esta función se sustituye sin
// tocar los componentes que la consumen.
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
