import type { Coordinates } from "./geocoding.js";

export interface AccommodationOffer {
  id: string;
  provider: string;
  name: string;
  totalPrice: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  latitude: number;
  longitude: number;
  distanceToCenterKm?: number;
  breakfastIncluded?: boolean;
  freeCancellation?: boolean;
  amenities: string[];
  capacity: number;
  bookingUrl?: string;
  fetchedAt: string;
}

export interface AccommodationSearchRequest {
  destination: string;
  // Centro de la ciudad ya resuelto por quien orquesta la búsqueda
  // (trip-planner.service.ts), no por el proveedor: geocodificar es una
  // llamada de red, y así se hace UNA vez por viaje en lugar de una por
  // cada proveedor que necesite saber dónde está la ciudad.
  center: Coordinates;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
}

export interface AccommodationProvider {
  searchAccommodations(request: AccommodationSearchRequest): Promise<AccommodationOffer[]>;
}
