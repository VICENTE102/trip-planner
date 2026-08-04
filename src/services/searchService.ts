import type { SearchParams, SearchResult, TierLevel, TripProposal } from "../types";
import { nightsBetween } from "../utils/dates";
import { mockHotelProvider } from "./hotelProvider";
import { mockFlightProvider } from "./flightProvider";
import { buildItinerary } from "./itineraryBuilder";
import { buildEconomicSummary } from "./economicSummary";

const TIERS: TierLevel[] = ["barato", "medio", "caro"];

export function buildSearchResult(searchParams: SearchParams): SearchResult {
  const nights = nightsBetween(searchParams.departureDate, searchParams.returnDate);
  const hotels = mockHotelProvider.getHotels(searchParams, nights);
  const flights = mockFlightProvider.getFlights(searchParams);

  const proposals: TripProposal[] = TIERS.map((tier) => {
    const hotel = hotels.find((h) => h.tier === tier)!;
    const itinerary = buildItinerary(searchParams, tier, flights);
    const economicSummary = buildEconomicSummary(searchParams, hotel, itinerary, tier);
    return { tier, hotel, itinerary, economicSummary };
  });

  return { searchParams, proposals };
}
