import type { TravelPreference } from "./trip.js";

export interface ItineraryItem {
  id: string;
  startTime: string;
  endTime: string;
  type: "arrival" | "transfer" | "hotel" | "meal" | "visit" | "walk" | "free_time";
  title: string;
  description?: string;
  placeId?: string;
  // Solo en los ítems de tipo "visit": la preferencia dominante del sitio.
  // Es lo que permite a la tarjeta del día elegir su foto y su etiqueta sin
  // conocer el vocabulario de categorías de cada proveedor.
  preference?: TravelPreference;
  latitude?: number;
  longitude?: number;
  durationMinutes: number;
  travelMinutesFromPrevious?: number;
  transportMode?: string;
  /**
   * Si `travelMinutesFromPrevious` es una estimación o una ruta real medida
   * por OpenRouteService. Ver TravelMatrixEntry.estimated.
   */
  travelEstimated?: boolean;
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
