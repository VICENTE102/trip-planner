import type { EconomicSummary, Hotel, Itinerary, SearchParams, TierLevel } from "../types";

const MEAL_COST_PER_DAY: Record<TierLevel, number> = { barato: 20, medio: 40, caro: 80 };
const TRANSPORT_COST_PER_DAY: Record<TierLevel, number> = { barato: 8, medio: 20, caro: 45 };
const ACTIVITIES_COST_PER_DAY: Record<TierLevel, number> = { barato: 5, medio: 25, caro: 60 };

export function buildEconomicSummary(
  params: SearchParams,
  hotel: Hotel,
  itinerary: Itinerary,
  tier: TierLevel,
): EconomicSummary {
  const { totalDays, totalNights } = itinerary;
  const { travelers } = params;

  const accommodation = hotel.totalPrice;
  const meals = Math.round(MEAL_COST_PER_DAY[tier] * totalDays * travelers);
  const transport = Math.round(TRANSPORT_COST_PER_DAY[tier] * totalDays * travelers);
  const activities = Math.round(ACTIVITIES_COST_PER_DAY[tier] * totalDays * travelers);
  const total = accommodation + meals + transport + activities;

  const budgetReference =
    params.budgetType === "total" ? params.budget : params.budget * totalNights;

  return {
    accommodation,
    meals,
    transport,
    activities,
    total,
    budgetReference,
    remaining: budgetReference - total,
  };
}
