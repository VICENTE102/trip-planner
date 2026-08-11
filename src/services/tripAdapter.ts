import type {
  DayMeal,
  DayStop,
  EconomicSummary,
  Flight,
  Hotel,
  Itinerary,
  ItineraryDay,
  SearchParams,
  SearchResult,
  TierLevel,
  TripProposal,
} from "../types";
import type {
  BackendItineraryDay,
  FlightOffer,
  FlightSegment,
  GenerateTripResponse,
  ItineraryItem,
  TripProposal as BackendTripProposal,
} from "./trip-api.client";
import { nightsBetween } from "../utils/dates";

// Única traducción entre el contrato del backend (server/types, orientado al
// motor: ofertas, bloques con hora, desglose de presupuesto en 7 partidas) y
// el modelo que renderiza la interfaz (src/types, orientado a la pantalla:
// mañana/tarde/noche, hotel, resumen de gastos). Existe para conectar el
// motor real sin rediseñar todas las vistas de golpe.
//
// Lo que el motor calcula y aquí todavía se pierde, por no tener dónde
// pintarlo: horas de inicio/fin, duraciones, desplazamientos entre sitios,
// pausas, coste por actividad, enlaces de reserva por actividad, y los
// campos score/rank/scoreBreakdown/reasons/warnings de cada propuesta.

const TYPE_TO_TIER: Record<BackendTripProposal["type"], TierLevel> = {
  economical: "barato",
  recommended: "medio",
  comfort: "caro",
};

// Los ISO del backend se construyen anclados a UTC (`fecha` + minutos desde
// medianoche, ver server/algorithms/schedule-itinerary.ts y flights.mock.ts),
// así que hay que leerlos en UTC. Con getHours() locales, un usuario en
// España vería toda la agenda desplazada dos horas.
function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

const AFTERNOON_START_MINUTES = 14 * 60;
const NIGHT_START_MINUTES = 20 * 60;

type Slot = "morning" | "afternoon" | "night";

function slotOf(item: ItineraryItem): Slot {
  const minutes = minutesOfDay(item.startTime);
  if (minutes < AFTERNOON_START_MINUTES) return "morning";
  if (minutes < NIGHT_START_MINUTES) return "afternoon";
  return "night";
}

const SLOT_LABELS: Record<Slot, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  night: "Noche",
};

// El backend no marca la categoría temática del sitio en el ItineraryItem
// (solo placeId y title), así que no hay clave con la que elegir foto en
// constants/blockImages.ts y las tarjetas caen en el icono genérico. Se
// arregla añadiendo `category` a ItineraryItem, que es un paso propio.
const UNKNOWN_ACTIVITY_ID = "";

function joinTitles(items: ItineraryItem[]): string {
  return items.map((item) => item.title).join(" · ");
}

function toHotel(proposal: BackendTripProposal, nights: number): Hotel {
  const { accommodation } = proposal;
  const rating = accommodation.rating ?? 0;

  return {
    id: accommodation.id,
    name: accommodation.name,
    tier: TYPE_TO_TIER[proposal.type],
    // El proveedor cotiza la estancia entera; el precio por noche es una
    // división, no un dato propio.
    pricePerNight: nights > 0 ? Math.round(accommodation.totalPrice / nights) : accommodation.totalPrice,
    totalPrice: Math.round(accommodation.totalPrice),
    rating,
    // El backend no tiene categoría de estrellas: se deriva de la
    // valoración (4,5/5 -> 4 estrellas), acotada a 1-5 para que la ficha
    // nunca pinte cero estrellas ni desborde.
    stars: Math.min(5, Math.max(1, Math.floor(rating))),
    amenities: accommodation.amenities,
  };
}

function toFlight(segments: FlightSegment[], offer: FlightOffer): Flight {
  const first = segments[0];
  const last = segments[segments.length - 1];

  return {
    id: `${offer.id}-${first.id}`,
    airline: first.carrier,
    departureTime: formatTime(first.departureTime),
    arrivalTime: formatTime(last.arrivalTime),
    durationMinutes: Math.round(
      (new Date(last.arrivalTime).getTime() - new Date(first.departureTime).getTime()) / 60000,
    ),
    // Escalas de ESTE trayecto. FlightOffer.stops solo cuenta las de la
    // ida, así que sirve para la ida pero no para la vuelta.
    stops: segments.length - 1,
    // price se deja sin definir a propósito: el importe es de ida y vuelta
    // y viaja en Itinerary.flightsTotalPrice.
  };
}

function toDay(backendDay: BackendItineraryDay, isArrivalDay: boolean): ItineraryDay {
  const items = [...backendDay.items].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const visits = items.filter((item) => item.type === "visit");
  const bySlot = (slot: Slot) => visits.filter((visit) => slotOf(visit) === slot);

  const morningVisits = bySlot("morning");
  const afternoonVisits = bySlot("afternoon");
  const nightVisits = bySlot("night");

  // Un día de llegada suele no tener visitas por la mañana porque el vuelo
  // ocupa esa franja: en ese caso el bloque cuenta la llegada y el registro
  // en el hotel, que es lo que realmente pasa ese rato.
  const arrivalItems = items.filter((item) => item.type === "arrival" || item.type === "hotel");
  const morning =
    morningVisits.length > 0
      ? joinTitles(morningVisits)
      : isArrivalDay && arrivalItems.length > 0
        ? joinTitles(arrivalItems)
        : "Mañana sin actividades programadas.";

  const meals: DayMeal[] = items
    .filter((item) => item.type === "meal")
    .map((item) => ({
      id: item.id,
      title: item.title,
      time: formatTime(item.startTime),
      costPerPerson: item.costPerPerson,
    }));

  // Solo las visitas traen coordenadas (el hotel y los traslados no las
  // llevan en el ItineraryItem), así que el mapa dibuja los sitios que se
  // visitan ese día. Un día sin visitas se queda sin mapa, no con un mapa
  // centrado en un punto inventado.
  const stops: DayStop[] = visits
    .filter((visit) => visit.latitude !== undefined && visit.longitude !== undefined)
    .map((visit) => ({
      id: visit.id,
      label: SLOT_LABELS[slotOf(visit)],
      text: visit.title,
      lat: visit.latitude!,
      lng: visit.longitude!,
    }));

  return {
    dayNumber: backendDay.dayNumber,
    date: backendDay.date,
    isArrivalDay,
    morning,
    morningActivityId: UNKNOWN_ACTIVITY_ID,
    meals,
    afternoon: afternoonVisits.length > 0 ? joinTitles(afternoonVisits) : "Tarde sin actividades programadas.",
    afternoonActivityId: UNKNOWN_ACTIVITY_ID,
    night: nightVisits.length > 0 ? joinTitles(nightVisits) : "Noche sin actividades programadas.",
    stops,
  };
}

function toItinerary(proposal: BackendTripProposal): Itinerary {
  const days = [...proposal.itinerary].sort((a, b) => a.dayNumber - b.dayNumber);
  const { flight } = proposal;

  return {
    totalDays: days.length,
    totalNights: Math.max(0, days.length - 1),
    outboundFlight: flight.outbound.length > 0 ? toFlight(flight.outbound, flight) : undefined,
    returnFlight: flight.inbound && flight.inbound.length > 0 ? toFlight(flight.inbound, flight) : undefined,
    flightsTotalPrice: Math.round(flight.totalPrice),
    days: days.map((day, index) => toDay(day, index === 0)),
  };
}

function toEconomicSummary(proposal: BackendTripProposal, budgetReference: number): EconomicSummary {
  const { budget } = proposal;
  const total = Math.round(budget.totalTripCost);

  return {
    accommodation: Math.round(budget.accommodationCost),
    meals: Math.round(budget.foodBudget),
    transport: Math.round(budget.localTransportCost),
    activities: Math.round(budget.activityCost),
    mainTransport: Math.round(budget.mainTransportCost),
    insurance: Math.round(budget.insuranceCost),
    emergencyReserve: Math.round(budget.emergencyReserve),
    total,
    budgetReference,
    remaining: budgetReference - total,
  };
}

export function toTripProposal(
  proposal: BackendTripProposal,
  searchParams: SearchParams,
): TripProposal {
  const nights = nightsBetween(searchParams.departureDate, searchParams.returnDate);

  return {
    tier: TYPE_TO_TIER[proposal.type],
    hotel: toHotel(proposal, nights),
    itinerary: toItinerary(proposal),
    economicSummary: toEconomicSummary(proposal, searchParams.budget),
  };
}

const TIER_ORDER: Record<TierLevel, number> = { barato: 0, medio: 1, caro: 2 };

export function toSearchResult(
  response: GenerateTripResponse,
  searchParams: SearchParams,
): SearchResult {
  const proposals = response.proposals
    .map((proposal) => toTripProposal(proposal, searchParams))
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  return { searchParams, proposals };
}
