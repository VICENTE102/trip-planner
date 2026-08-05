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
  capacity: number;
  bookingUrl?: string;
  fetchedAt: string;
}

export interface AccommodationSearchRequest {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
}

export interface AccommodationProvider {
  searchAccommodations(request: AccommodationSearchRequest): Promise<AccommodationOffer[]>;
}
