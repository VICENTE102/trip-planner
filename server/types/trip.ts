import type { AccommodationOffer } from "./accommodation.js";
import type { ActivityCandidate } from "./activity.js";
import type { FlightOffer } from "./flight.js";
import type { ItineraryDay } from "./itinerary.js";

export type TravelPreference =
  | "beach"
  | "culture"
  | "gastronomy"
  | "nightlife"
  | "nature"
  | "shopping"
  | "family"
  | "relax";

export type PreferenceLevel = 0 | 1 | 2 | 3;

export type PreferenceProfile = Record<TravelPreference, PreferenceLevel>;

export interface TripRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: {
    adults: number;
    children: number;
  };
  budget: number;
  currency: "EUR" | "USD" | "GBP";
  travelStyle: "economical" | "balanced" | "comfort";
  preferences: PreferenceProfile;
  constraints?: {
    reducedMobility?: boolean;
    dietaryRestrictions?: string[];
    earliestStartTime?: string;
    latestEndTime?: string;
    maxWalkingMinutes?: number;
    checkedBaggageRequired?: boolean;
  };
}

// Sección 9: desglose de presupuesto de una combinación concreta.
export interface BudgetBreakdown {
  mainTransportCost: number;
  accommodationCost: number;
  foodBudget: number;
  activityCost: number;
  localTransportCost: number;
  insuranceCost: number;
  emergencyReserve: number;
  totalTripCost: number;
}

// Sección 10: candidato pre-puntuación, antes de construir el itinerario.
export interface TripCombination {
  id: string;
  flight: FlightOffer;
  accommodation: AccommodationOffer;
  activities: ActivityCandidate[];
  budget: BudgetBreakdown;
}

export type ProposalType = "economical" | "recommended" | "comfort";

// Sección 10.2: desglose de la puntuación global por criterio (0-100 cada uno).
export interface ScoreBreakdown {
  price: number;
  accommodationQuality: number;
  location: number;
  transportComfort: number;
  usableTime: number;
  preferenceMatch: number;
}

// Sección 1.2 / 10.7: propuesta final ya puntuada y explicada.
export interface TripProposal {
  type: ProposalType;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  flight: FlightOffer;
  accommodation: AccommodationOffer;
  itinerary: ItineraryDay[];
  budget: BudgetBreakdown;
  totalCost: number;
  costPerPerson: number;
  evaluatedCombinations: number;
  discardedCombinations: number;
  reasons: string[];
  warnings: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}
