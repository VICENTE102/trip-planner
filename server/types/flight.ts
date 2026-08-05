export interface FlightSegment {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  carrier: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface FlightOffer {
  id: string;
  provider: string;
  totalPrice: number;
  currency: string;
  outbound: FlightSegment[];
  inbound?: FlightSegment[];
  totalDurationMinutes: number;
  stops: number;
  baggageIncluded: boolean;
  refundable: boolean;
  bookingUrl?: string;
  fetchedAt: string;
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
}

export interface FlightProvider {
  searchFlights(request: FlightSearchRequest): Promise<FlightOffer[]>;
}
