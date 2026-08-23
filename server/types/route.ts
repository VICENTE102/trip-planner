export interface RoutePlace {
  id: string;
  latitude: number;
  longitude: number;
}

export interface TravelMatrixEntry {
  fromId: string;
  toId: string;
  distanceKm: number;
  travelMinutes: number;
  transportMode: "walk" | "transit";
  /**
   * `false` solo cuando el número viene de una ruta real por calle
   * (OpenRouteService, caminando). Es `true` para la estimación en línea
   * recta y también para el transporte público, que se deriva de la
   * distancia real pero sigue siendo una suposición: la API pública de ORS
   * no tiene transporte.
   *
   * Sin esto la interfaz no puede distinguir "12 minutos andando, medidos
   * sobre el callejero" de "12 minutos, calculados dividiendo una línea
   * recta por 4,5 km/h", y son cosas muy distintas.
   */
  estimated: boolean;
}

export interface RoutesProvider {
  calculateTravelMatrix(places: RoutePlace[]): Promise<TravelMatrixEntry[]>;
}
