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
}

export interface RoutesProvider {
  calculateTravelMatrix(places: RoutePlace[]): Promise<TravelMatrixEntry[]>;
}
