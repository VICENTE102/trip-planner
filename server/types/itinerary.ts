export interface ItineraryItem {
  id: string;
  startTime: string;
  endTime: string;
  type: "arrival" | "transfer" | "hotel" | "meal" | "visit" | "walk" | "free_time";
  title: string;
  description?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  durationMinutes: number;
  travelMinutesFromPrevious?: number;
  transportMode?: string;
  costPerPerson?: number;
  bookingRequired?: boolean;
  bookingUrl?: string;
  verificationStatus: "verified" | "partial" | "unverified";
  notes?: string[];
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  items: ItineraryItem[];
}
