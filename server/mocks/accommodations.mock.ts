import type { AccommodationOffer, AccommodationSearchRequest } from "../types/accommodation.js";
import { createSeededRandom, hashString, pick } from "../utils/random.js";
import { fakeCityCenter, jitterCoordinates } from "../utils/geo.js";

const NAME_PREFIXES = ["Hotel", "Suites", "Residencia", "Posada", "Hostal", "Apartamentos"];
const NAME_SUFFIXES = ["Central", "Plaza", "Mirador", "del Puerto", "Real", "Boutique", "Jardín", "Estación"];

const AVAILABLE_AMENITIES = [
  "Wifi gratis",
  "Aire acondicionado",
  "Piscina",
  "Spa",
  "Gimnasio",
  "Parking",
  "Restaurante",
  "Vistas panorámicas",
];

function pickAmenities(random: () => number): string[] {
  const count = 1 + Math.floor(random() * AVAILABLE_AMENITIES.length);
  const shuffled = [...AVAILABLE_AMENITIES].sort(() => random() - 0.5);
  return shuffled.slice(0, count);
}

const MIN_OFFERS = 15;
const MAX_OFFERS = 20;

function nightsBetween(checkInDate: string, checkOutDate: string): number {
  const ms = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function generateMockAccommodations(request: AccommodationSearchRequest): AccommodationOffer[] {
  const seed = hashString(`${request.destination}-${request.checkInDate}-${request.checkOutDate}`);
  const countRandom = createSeededRandom(seed);
  const count = MIN_OFFERS + Math.floor(countRandom() * (MAX_OFFERS - MIN_OFFERS + 1));
  const nights = nightsBetween(request.checkInDate, request.checkOutDate);
  const travelers = Math.max(1, request.adults + request.children);
  const center = fakeCityCenter(request.destination);

  const offers: AccommodationOffer[] = [];
  for (let i = 0; i < count; i++) {
    const random = createSeededRandom(seed + i * 131 + 1);
    const pricePerNight = Math.round(35 + random() * 220);
    const coordinates = jitterCoordinates(center, random, 0.12);

    offers.push({
      id: `hotel-${seed}-${i}`,
      provider: "MockAccommodationProvider",
      name: `${pick(NAME_PREFIXES, random)} ${request.destination} ${pick(NAME_SUFFIXES, random)}`,
      totalPrice: pricePerNight * nights,
      currency: "EUR",
      rating: Math.round((3 + random() * 2) * 10) / 10,
      reviewCount: Math.round(20 + random() * 2000),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      distanceToCenterKm: Math.round(random() * 6 * 10) / 10,
      breakfastIncluded: random() > 0.5,
      freeCancellation: random() > 0.4,
      amenities: pickAmenities(random),
      capacity: travelers + Math.floor(random() * 3),
      fetchedAt: new Date().toISOString(),
    });
  }

  return offers;
}
