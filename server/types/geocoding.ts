export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodedCity {
  coordinates: Coordinates;
  // Nombre tal y como lo devuelve el proveedor ("Roma, Italia"): no se
  // muestra en pantalla, sirve para poder auditar en la caché qué ciudad
  // entendió realmente el geocodificador cuando algo salga raro.
  formattedName?: string;
  countryCode?: string;
}

// Mismo patrón que RoutesProvider y PlacesProvider (server/types/route.ts,
// server/types/activity.ts): la interfaz describe la capacidad y cada
// implementación decide de dónde salen los datos.
//
// Contrato de los tres desenlaces posibles, que el servicio distingue:
//   - devuelve GeocodedCity  -> encontrada
//   - devuelve undefined     -> el proveedor respondió bien pero no conoce
//                               ese sitio (se cachea como "no encontrado")
//   - lanza                  -> fallo de red, cuota o respuesta ilegible
//                               (NO se cachea: hay que reintentarlo)
export interface GeocodingProvider {
  readonly name: string;
  geocodeCity(destination: string): Promise<GeocodedCity | undefined>;
}
