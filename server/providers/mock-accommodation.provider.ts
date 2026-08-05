import type { AccommodationProvider, AccommodationSearchRequest } from "../types/accommodation.js";
import { generateMockAccommodations } from "../mocks/accommodations.mock.js";

export const mockAccommodationProvider: AccommodationProvider = {
  async searchAccommodations(request: AccommodationSearchRequest) {
    return generateMockAccommodations(request);
  },
};
