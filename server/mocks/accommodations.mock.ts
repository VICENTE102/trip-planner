import type { AccommodationOffer, AccommodationSearchRequest } from "../types/accommodation.js";
import { createSeededRandom, hashString, pick } from "../utils/random.js";
import { haversineDistanceKm, jitterCoordinates } from "../utils/geo.js";

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

// El número de servicios sube con el nivel del hotel: uno de 35 €/noche no
// tiene spa ni gimnasio.
function pickAmenities(random: () => number, tier: number): string[] {
  const count = Math.max(1, Math.round(1 + tier * (AVAILABLE_AMENITIES.length - 1)));
  const shuffled = [...AVAILABLE_AMENITIES].sort(() => random() - 0.5);
  return shuffled.slice(0, count);
}

// Ruido acotado alrededor de un valor, para que la relación precio-calidad
// no sea una recta perfecta: entre hoteles del mismo precio también hay
// mejores y peores.
function jitter(value: number, amount: number, random: () => number): number {
  return value + (random() - 0.5) * 2 * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
  const { center } = request;

  const offers: AccommodationOffer[] = [];
  for (let i = 0; i < count; i++) {
    const random = createSeededRandom(seed + i * 131 + 1);

    // Un único "nivel" 0-1 del que cuelga todo lo demás.
    //
    // Antes el precio y la valoración eran dos tiradas independientes, así
    // que pagar más no compraba nada: un hotel de 255 €/noche podía tener
    // peor nota, estar más lejos y ofrecer menos servicios que uno de 40 €.
    // El motor lo detectaba y hacía lo correcto —con 3.000 € de presupuesto
    // seguía proponiendo hoteles baratos, porque gastarlos no mejoraba el
    // viaje— pero el resultado no tenía ningún sentido para quien lo leía.
    //
    // Un hotel real cuesta más porque está más céntrico, mejor valorado y
    // con más servicios. El mock tiene que ser un sustituto verosímil, y
    // esto es lo que hace que las tres propuestas signifiquen algo.
    const tier = random();

    const pricePerNight = Math.round(clamp(jitter(35 + tier * 220, 18, random), 30, 280));
    // Los mejores están más céntricos: el radio de dispersión se estrecha
    // según sube el nivel.
    const coordinates = jitterCoordinates(center, random, 0.16 - tier * 0.11);

    offers.push({
      id: `hotel-${seed}-${i}`,
      provider: "MockAccommodationProvider",
      name: `${pick(NAME_PREFIXES, random)} ${request.destination} ${pick(NAME_SUFFIXES, random)}`,
      totalPrice: pricePerNight * nights,
      currency: "EUR",
      rating: Math.round(clamp(jitter(3 + tier * 2, 0.35, random), 1, 5) * 10) / 10,
      reviewCount: Math.round(20 + random() * 2000),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      // Se calcula de verdad desde el centro de la ciudad, en vez de
      // inventarlo: con `center` ya resuelto, un número aleatorio podía
      // contradecir a las propias coordenadas del hotel (y al mapa).
      distanceToCenterKm:
        Math.round(haversineDistanceKm(center.lat, center.lng, coordinates.lat, coordinates.lng) * 10) / 10,
      breakfastIncluded: tier > 0.4,
      freeCancellation: tier > 0.3,
      amenities: pickAmenities(random, tier),
      capacity: travelers + Math.floor(random() * 3),
      fetchedAt: new Date().toISOString(),
    });
  }

  return offers;
}
