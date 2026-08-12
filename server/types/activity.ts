import type { PreferenceProfile } from "./trip.js";
import type { Coordinates } from "./geocoding.js";

export interface OpeningPeriod {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  opensAt: string;
  closesAt: string;
}

export interface ActivityCandidate {
  id: string;
  name: string;
  category: string;
  profile: PreferenceProfile;
  latitude: number;
  longitude: number;
  rating?: number;
  pricePerPerson?: number;
  estimatedDurationMinutes: number;
  openingHours?: OpeningPeriod[];
  bookingRequired?: boolean;
  bookingUrl?: string;
  verificationStatus: "verified" | "partial" | "unverified";
}

export interface ActivitySearchRequest {
  destination: string;
  // Ver AccommodationSearchRequest.center: lo resuelve el orquestador una
  // sola vez y se lo pasa a los dos proveedores.
  center: Coordinates;
  preferences: PreferenceProfile;
}

export interface PlacesProvider {
  searchActivities(request: ActivitySearchRequest): Promise<ActivityCandidate[]>;
}
