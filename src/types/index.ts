export type TierLevel = "barato" | "medio" | "caro";

export type TripCategory = "economico" | "equilibrado" | "comodo";

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
  travelers: number;
  children: number;
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
  tier: TierLevel;
}

export interface DayStop {
  id: string;
  label: string;
  text: string;
  lat: number;
  lng: number;
}

// Capa de ediciones del usuario sobre un día generado. Nunca sobrescribe los
// campos originales (morning/afternoon/night/restaurant en ItineraryDay) —
// se guarda aparte para poder "restaurar" un bloque sin perder lo que generó
// el motor. Un campo ausente aquí significa "sin editar, usar el original".
export interface DayEdits {
  morning?: string;
  afternoon?: string;
  night?: string;
  restaurant?: Partial<Omit<Restaurant, "tier">>;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string; // ISO date
  isArrivalDay: boolean;
  morning: string;
  morningActivityId: string;
  restaurant: Restaurant;
  afternoon: string;
  afternoonActivityId: string;
  night: string;
  // Coordenadas ficticias y deterministas (ver src/utils/geo.ts) para pintar
  // el mapa de "Día a día" mientras no hay coordenadas reales.
  stops: DayStop[];
  edits?: DayEdits;
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
