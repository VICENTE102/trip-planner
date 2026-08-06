import type { RoutePlace, RoutesProvider, TravelMatrixEntry } from "../types/route.js";
import { calculateTravelMatrix } from "../algorithms/cluster-places.js";

export const mockRoutesProvider: RoutesProvider = {
  async calculateTravelMatrix(places: RoutePlace[]): Promise<TravelMatrixEntry[]> {
    return calculateTravelMatrix(places);
  },
};
