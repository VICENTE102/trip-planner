import type { FlightProvider, FlightSearchRequest } from "../types/flight.js";
import { generateMockFlights } from "../mocks/flights.mock.js";

export const mockFlightProvider: FlightProvider = {
  async searchFlights(request: FlightSearchRequest) {
    return generateMockFlights(request);
  },
};
