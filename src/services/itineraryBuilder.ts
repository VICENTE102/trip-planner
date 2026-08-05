import type { Flight, Itinerary, ItineraryDay, SearchParams, TierLevel } from "../types";
import { addDays, nightsBetween } from "../utils/dates";
import { createSeededRandom, hashString } from "../utils/random";
import {
  buildRestaurant,
  pickAfternoonActivity,
  pickMorningActivity,
  pickNightActivity,
} from "./mockContent";

export function buildItinerary(
  params: SearchParams,
  tier: TierLevel,
  flights?: { outbound: Flight; return: Flight },
): Itinerary {
  const totalNights = nightsBetween(params.departureDate, params.returnDate);
  const totalDays = totalNights + 1;
  const random = createSeededRandom(
    hashString(`${params.destination}-${params.departureDate}-${tier}-itinerary`),
  );

  const days: ItineraryDay[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const isArrivalDay = day === 1;
    const morningActivity = isArrivalDay
      ? { id: "llegada", text: `Llegada a ${params.destination}, traslado y registro en el hotel` }
      : pickMorningActivity(params.destination, tier, params.preferences, random);
    const afternoonActivity = isArrivalDay
      ? { id: "orientacion", text: "Primer paseo de orientación por los alrededores del alojamiento" }
      : pickAfternoonActivity(params.destination, tier, params.preferences, random);
    const night = pickNightActivity(tier, params.preferences, random);
    const restaurant = buildRestaurant(tier, random);

    days.push({
      dayNumber: day,
      date: addDays(params.departureDate, day - 1),
      isArrivalDay,
      morning: morningActivity.text,
      morningActivityId: morningActivity.id,
      restaurant,
      afternoon: afternoonActivity.text,
      afternoonActivityId: afternoonActivity.id,
      night,
    });
  }

  return {
    totalDays,
    totalNights,
    outboundFlight: flights?.outbound,
    returnFlight: flights?.return,
    days,
  };
}
