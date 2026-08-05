import type { ActivitySearchRequest, PlacesProvider } from "../types/activity.js";
import { generateMockActivities } from "../mocks/activities.mock.js";

export const mockPlacesProvider: PlacesProvider = {
  async searchActivities(request: ActivitySearchRequest) {
    return generateMockActivities(request);
  },
};
