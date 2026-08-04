export type TierLevel = "barato" | "medio" | "caro";

export type TripCategory = "economico" | "equilibrado" | "comodo" | "sorprendeme";

export const PREFERENCES = [
  "Playa",
  "Cultura",
  "Gastronomía",
  "Vida nocturna",
  "Naturaleza",
  "Compras",
  "Familia",
  "Relax",
] as const;

export type Preference = (typeof PREFERENCES)[number];

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string; // ISO date (YYYY-MM-DD)
  returnDate: string; // ISO date (YYYY-MM-DD)
  budget: number;
  budgetType: "total" | "perNight";
  travelers: number;
  category: TripCategory;
  preferences: Preference[];
}

export interface Hotel {
  id: string;
  name: string;
  tier: TierLevel;
  pricePerNight: number;
  totalPrice: number;
  rating: number; // 0-5
  stars: number; // 1-5
  amenities: string[];
  imageUrl?: string;
}

export interface Flight {
  id: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  price: number;
}

export interface Restaurant {
  name: string;
  description: string;
  area: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string; // ISO date
  isArrivalDay: boolean;
  morning: string;
  restaurant: Restaurant;
  afternoon: string;
  night: string;
}

export interface Itinerary {
  totalDays: number;
  totalNights: number;
  outboundFlight?: Flight;
  returnFlight?: Flight;
  days: ItineraryDay[];
}

export interface EconomicSummary {
  accommodation: number;
  meals: number;
  transport: number;
  activities: number;
  total: number;
  budgetReference: number;
  remaining: number;
}

export interface TripProposal {
  tier: TierLevel;
  hotel: Hotel;
  itinerary: Itinerary;
  economicSummary: EconomicSummary;
}

export interface SearchResult {
  searchParams: SearchParams;
  proposals: TripProposal[];
}

export interface Trip {
  id: string;
  createdAt: string; // ISO datetime
  searchParams: SearchParams;
  proposal: TripProposal;
}
