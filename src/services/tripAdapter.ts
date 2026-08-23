import type {
  DataConfidence,
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
// pintarlo: horas de inicio/fin, duraciones, pausas, coste por actividad, y
// los campos score/rank/scoreBreakdown de cada propuesta.
//
// `reasons` y `warnings` sí llegan desde el Paso "sacar las razones a la
// comparativa": son frases ya redactadas por el motor y eran lo más
// desaprovechado de la respuesta.
//
// Y desde "enseñar lo real": `verificationStatus`, `bookingUrl` (que para un
// sitio de Overture es su web oficial) y `travelMinutesFromPrevious` con su
// `travelEstimated`. Los tres llegaban por la red y se tiraban aquí. El
// último era el más caro de todos: integramos OpenRouteService en el Paso 5
// para medir los paseos sobre el callejero real y no se veía un solo minuto
// en pantalla, solo influía en silencio en la hora de cada visita.

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

// El backend marca cada visita con su preferencia dominante (ocho valores,
// ver server/utils/preferences.ts). Aquí se traduce a la clave temática con
// la que constants/blockImages.ts guarda su foto y DayCard su etiqueta.
//
// Se mapea la preferencia y no la categoría del proveedor a propósito: el
// mock habla en temas en español y Overture en `basic_category` inglesas y
// mucho más finas ("museum", "art_gallery", "historic_site"...). La
// preferencia es el único vocabulario que comparten los dos.
const PREFERENCE_TO_ACTIVITY_ID: Record<string, string> = {
  beach: "playa",
  culture: "cultura",
  gastronomy: "gastronomia",
  nightlife: "vida-nocturna",
  nature: "naturaleza",
  shopping: "compras",
  family: "familia",
  relax: "relax",
};

// Una franja sin visitas —o con una visita cuyo sitio no tiene afinidad con
// ninguna preferencia— se queda sin foto y cae en el icono genérico, que es
// mejor que enseñar una playa en un día de museos.
const UNKNOWN_ACTIVITY_ID = "";

function activityIdOf(items: ItineraryItem[]): string {
  for (const item of items) {
    const id = item.preference ? PREFERENCE_TO_ACTIVITY_ID[item.preference] : undefined;
    if (id) return id;
  }
  return UNKNOWN_ACTIVITY_ID;
}

function joinTitles(items: ItineraryItem[]): string {
  return items.map((item) => item.title).join(" · ");
}

// El backend ya distingue de dónde sale cada sitio y nadie lo miraba:
//
//   partial     Overture Maps: el sitio existe y está donde dice; su precio
//               y su duración siguen siendo estimaciones
//   verified    reservado para cuando haya un proveedor que confirme también
//               tarifas y horarios; hoy no lo pone nadie
//   unverified  generado por los mocks: no existe
//
// "partial" se traduce a "real" y no a "estimado" porque lo que la etiqueta
// promete es el sitio, no la tarifa. La letra pequeña está en /fuentes.
function confidenceOf(item: ItineraryItem): DataConfidence {
  return item.verificationStatus === "unverified" ? "simulado" : "real";
}

// Un día es de sitios reales solo si TODAS sus visitas lo son: basta una
// inventada para que la etiqueta deje de ser cierta, y una etiqueta que
// miente a veces no sirve de nada.
function dayConfidence(visits: ItineraryItem[]): DataConfidence | undefined {
  if (visits.length === 0) return undefined;
  return visits.every((visit) => confidenceOf(visit) === "real") ? "real" : "simulado";
}

function toHotel(proposal: BackendTripProposal, nights: number): Hotel {
  const { accommodation } = proposal;

  return {
    id: accommodation.id,
    name: accommodation.name,
    tier: TYPE_TO_TIER[proposal.type],
    // El proveedor cotiza la estancia entera; el precio por noche es una
    // división, no un dato propio.
    pricePerNight: nights > 0 ? Math.round(accommodation.totalPrice / nights) : accommodation.totalPrice,
    totalPrice: Math.round(accommodation.totalPrice),
    rating: accommodation.rating ?? 0,
    // Aquí se derivaban unas estrellas de la valoración
    // (`Math.floor(rating)`, 3,8/5 -> ★★★) y se pintaban al lado de la propia
    // valoración. No eran dos datos: era el mismo número dos veces, y el
    // primero disfrazado de categoría hotelera, que el backend no tiene.
    // Se enseña solo la valoración, que es lo que de verdad hay.
    amenities: accommodation.amenities,
    distanceToCenterKm: accommodation.distanceToCenterKm,
    freeCancellation: accommodation.freeCancellation,
    breakfastIncluded: accommodation.breakfastIncluded,
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
      verification: confidenceOf(visit),
      website: visit.bookingUrl,
      travelMinutes: visit.travelMinutesFromPrevious,
      transportMode: visit.transportMode === "transit" ? "transit" : visit.transportMode === "walk" ? "walk" : undefined,
      travelEstimated: visit.travelEstimated,
    }));

  return {
    dayNumber: backendDay.dayNumber,
    date: backendDay.date,
    isArrivalDay,
    morning,
    // El día de llegada tiene su propia foto (el aeropuerto) cuando el vuelo
    // ocupa la mañana y no hay visitas que representar.
    morningActivityId:
      morningVisits.length > 0
        ? activityIdOf(morningVisits)
        : isArrivalDay && arrivalItems.length > 0
          ? "llegada"
          : UNKNOWN_ACTIVITY_ID,
    meals,
    afternoon: afternoonVisits.length > 0 ? joinTitles(afternoonVisits) : "Tarde sin actividades programadas.",
    afternoonActivityId: activityIdOf(afternoonVisits),
    night: nightVisits.length > 0 ? joinTitles(nightVisits) : "Noche sin actividades programadas.",
    stops,
    placesVerification: dayConfidence(visits),
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

// Razones que NO se repiten en todas las propuestas.
//
// Se decide comparando los textos entre sí, no con una lista de frases
// prohibidas: así sigue funcionando cuando el motor añada razones nuevas.
// Hace falta porque hay al menos una que sale idéntica en las tres —"La
// afinidad con la cultura y la gastronomía es alta"— y es lógico: se deriva
// de las preferencias del usuario, no de la propuesta. En una comparativa
// una línea repetida en las tres columnas no compara nada.
export function pickDistinguishingReasons(reasons: string[], allProposalReasons: string[][]): string[] {
  if (allProposalReasons.length < 2) {
    return reasons;
  }

  return reasons.filter((reason) => !allProposalReasons.every((other) => other.includes(reason)));
}

export function toTripProposal(
  proposal: BackendTripProposal,
  searchParams: SearchParams,
  allProposalReasons: string[][] = [],
): TripProposal {
  const nights = nightsBetween(searchParams.departureDate, searchParams.returnDate);
  const reasons = proposal.reasons ?? [];

  return {
    tier: TYPE_TO_TIER[proposal.type],
    hotel: toHotel(proposal, nights),
    itinerary: toItinerary(proposal),
    economicSummary: toEconomicSummary(proposal, searchParams.budget),
    reasons,
    distinguishingReasons: pickDistinguishingReasons(reasons, allProposalReasons),
    warnings: proposal.warnings ?? [],
  };
}

const TIER_ORDER: Record<TierLevel, number> = { barato: 0, medio: 1, caro: 2 };

export function toSearchResult(
  response: GenerateTripResponse,
  searchParams: SearchParams,
): SearchResult {
  const allProposalReasons = response.proposals.map((proposal) => proposal.reasons ?? []);

  const proposals = response.proposals
    .map((proposal) => toTripProposal(proposal, searchParams, allProposalReasons))
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  return {
    searchParams,
    proposals,
    disclaimer: response.metadata.disclaimer,
    budgetUnlock: response.metadata.budgetUnlock ?? null,
  };
}
