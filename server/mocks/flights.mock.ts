import type { FlightOffer, FlightSearchRequest, FlightSegment } from "../types/flight.js";
import { createSeededRandom, hashString, pick } from "../utils/random.js";

const AIRLINES = [
  "Iberia",
  "Vueling",
  "Ryanair",
  "Air Europa",
  "EasyJet",
  "Lufthansa",
  "Air France",
  "TAP Portugal",
  "British Airways",
  "KLM",
];

const HUB_CITIES = ["Madrid", "París", "Fráncfort", "Ámsterdam", "Lisboa", "Múnich", "Roma"];

const MIN_OFFERS = 15;
const MAX_OFFERS = 20;

function addMinutes(date: string, minutes: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCMinutes(base.getUTCMinutes() + minutes);
  return base.toISOString();
}

function buildSegment(
  random: () => number,
  origin: string,
  destination: string,
  date: string,
  departureMinutes: number,
): FlightSegment {
  const durationMinutes = Math.round(70 + random() * 240);
  const carrier = pick(AIRLINES, random);

  return {
    id: `seg-${hashString(`${origin}-${destination}-${date}-${departureMinutes}-${random()}`)}`,
    origin,
    destination,
    departureTime: addMinutes(date, departureMinutes),
    arrivalTime: addMinutes(date, departureMinutes + durationMinutes),
    carrier,
    flightNumber: `${carrier.slice(0, 2).toUpperCase()}${Math.floor(100 + random() * 899)}`,
    durationMinutes,
  };
}

function buildLeg(random: () => number, origin: string, destination: string, date: string): FlightSegment[] {
  const hasStop = random() > 0.65;
  const departureMinutes = Math.floor(360 + random() * 900); // entre 06:00 y 21:00

  if (!hasStop) {
    return [buildSegment(random, origin, destination, date, departureMinutes)];
  }

  const availableHubs = HUB_CITIES.filter((city) => city !== origin && city !== destination);
  const hub = pick(availableHubs, random);
  const firstLeg = buildSegment(random, origin, hub, date, departureMinutes);
  const layoverMinutes = Math.round(40 + random() * 80);
  const secondDepartureMinutes = departureMinutes + firstLeg.durationMinutes + layoverMinutes;
  const secondLeg = buildSegment(random, hub, destination, date, secondDepartureMinutes);

  return [firstLeg, secondLeg];
}

function totalDurationMinutes(segments: FlightSegment[]): number {
  const first = segments[0];
  const last = segments[segments.length - 1];
  return Math.round((new Date(last.arrivalTime).getTime() - new Date(first.departureTime).getTime()) / 60000);
}

export function generateMockFlights(request: FlightSearchRequest): FlightOffer[] {
  const seed = hashString(
    `${request.origin}-${request.destination}-${request.departureDate}-${request.returnDate}`,
  );
  const countRandom = createSeededRandom(seed);
  const count = MIN_OFFERS + Math.floor(countRandom() * (MAX_OFFERS - MIN_OFFERS + 1));
  const travelers = Math.max(1, request.adults + request.children);

  const offers: FlightOffer[] = [];
  for (let i = 0; i < count; i++) {
    const random = createSeededRandom(seed + i * 97 + 1);
    const outbound = buildLeg(random, request.origin, request.destination, request.departureDate);
    const inbound = buildLeg(random, request.destination, request.origin, request.returnDate);
    const stops = outbound.length - 1;
    const pricePerTraveler = Math.max(30, Math.round(50 + random() * 320 - stops * 25));

    offers.push({
      id: `flight-${seed}-${i}`,
      provider: "MockFlightProvider",
      totalPrice: pricePerTraveler * travelers,
      currency: "EUR",
      outbound,
      inbound,
      // Duración total de ida y vuelta (no solo la ida): es la que necesita
      // el motor de puntuación para comparar "aprovechamiento del tiempo"
      // entre vuelos (sección 10.2/11.2, Fase 7).
      totalDurationMinutes: totalDurationMinutes(outbound) + totalDurationMinutes(inbound),
      stops,
      baggageIncluded: random() > 0.4,
      refundable: random() > 0.75,
      fetchedAt: new Date().toISOString(),
    });
  }

  return offers;
}
