import type { Flight, SearchParams } from "../types";
import { createSeededRandom, hashString, pick } from "../utils/random";

export interface FlightProvider {
  getFlights(params: SearchParams): { outbound: Flight; return: Flight };
}

const AIRLINES = ["Iberia", "Vueling", "Ryanair", "Air Europa", "EasyJet"];

function buildFlight(
  random: () => number,
  idPrefix: string,
  date: string,
  travelers: number,
): Flight {
  const stops = random() > 0.7 ? 1 : 0;
  const durationMinutes = Math.round(90 + random() * 300 + stops * 90);
  const departureHour = Math.floor(6 + random() * 14);
  const departureMinute = pick([0, 15, 30, 45], random);
  const arrivalTotalMinutes = departureHour * 60 + departureMinute + durationMinutes;

  const pricePerTraveler = Math.round(60 + random() * 240 + stops * -20);

  return {
    id: `${idPrefix}-${date}`,
    airline: pick(AIRLINES, random),
    departureTime: `${String(departureHour).padStart(2, "0")}:${String(departureMinute).padStart(2, "0")}`,
    arrivalTime: `${String(Math.floor(arrivalTotalMinutes / 60) % 24).padStart(2, "0")}:${String(arrivalTotalMinutes % 60).padStart(2, "0")}`,
    durationMinutes,
    stops,
    price: pricePerTraveler * travelers,
  };
}

export const mockFlightProvider: FlightProvider = {
  getFlights(params) {
    const seed = hashString(`${params.destination}-${params.departureDate}-${params.returnDate}`);
    const outboundRandom = createSeededRandom(seed);
    const returnRandom = createSeededRandom(seed + 1000);

    return {
      outbound: buildFlight(outboundRandom, "out", params.departureDate, params.travelers),
      return: buildFlight(returnRandom, "ret", params.returnDate, params.travelers),
    };
  },
};
