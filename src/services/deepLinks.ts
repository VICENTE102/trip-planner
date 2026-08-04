import { normalizeCityName } from "../utils/text";

// City-name based deep links (no real booking API yet). Airline/city coverage
// is intentionally limited — see IATA_BY_CITY — so every builder degrades to a
// generic search when we can't resolve what we need.

const IATA_BY_CITY: Record<string, string> = {
  madrid: "MAD",
  barcelona: "BCN",
  lisboa: "LIS",
  lisbon: "LIS",
  oporto: "OPO",
  porto: "OPO",
  paris: "CDG",
  londres: "LON",
  london: "LON",
  roma: "FCO",
  rome: "FCO",
  milan: "MXP",
  milán: "MXP",
  venecia: "VCE",
  venice: "VCE",
  napoles: "NAP",
  nápoles: "NAP",
  naples: "NAP",
  berlin: "BER",
  berlín: "BER",
  munich: "MUC",
  múnich: "MUC",
  frankfurt: "FRA",
  amsterdam: "AMS",
  ámsterdam: "AMS",
  bruselas: "BRU",
  brussels: "BRU",
  dublin: "DUB",
  dublín: "DUB",
  viena: "VIE",
  vienna: "VIE",
  zurich: "ZRH",
  zúrich: "ZRH",
  ginebra: "GVA",
  geneva: "GVA",
  copenhague: "CPH",
  copenhagen: "CPH",
  estocolmo: "ARN",
  stockholm: "ARN",
  oslo: "OSL",
  helsinki: "HEL",
  atenas: "ATH",
  athens: "ATH",
  praga: "PRG",
  prague: "PRG",
  budapest: "BUD",
  varsovia: "WAW",
  warsaw: "WAW",
  cracovia: "KRK",
  krakow: "KRK",
  lyon: "LYS",
  niza: "NCE",
  nice: "NCE",
  marsella: "MRS",
  marseille: "MRS",
  sevilla: "SVQ",
  seville: "SVQ",
  valencia: "VLC",
  malaga: "AGP",
  málaga: "AGP",
  "palma de mallorca": "PMI",
  palma: "PMI",
  ibiza: "IBZ",
  bilbao: "BIO",
  edimburgo: "EDI",
  edinburgh: "EDI",
  manchester: "MAN",
  estambul: "IST",
  istanbul: "IST",
  reikiavik: "KEF",
  reykjavik: "KEF",
  liubliana: "LJU",
  ljubljana: "LJU",
  zagreb: "ZAG",
  belgrado: "BEG",
  belgrade: "BEG",
  bucarest: "OTP",
  bucharest: "OTP",
  sofia: "SOF",
  sofía: "SOF",
};

function lookupIata(city: string): string | undefined {
  return IATA_BY_CITY[normalizeCityName(city)];
}

type FlightLinkBuilder = (
  originIata: string,
  destinationIata: string,
  departureDate: string,
  returnDate: string,
  travelers: number,
) => string;

const AIRLINE_LINK_BUILDERS: Record<string, FlightLinkBuilder> = {
  Ryanair: (originIata, destinationIata, departureDate, returnDate, travelers) =>
    `https://www.ryanair.com/es/es/trip/flights/select?adults=${travelers}&teens=0&children=0&infants=0&dateOut=${departureDate}&dateIn=${returnDate}&isConnectedFlight=false&isReturn=true&discount=0&promoCode=&originIata=${originIata}&destinationIata=${destinationIata}`,
  Vueling: (originIata, destinationIata, departureDate, returnDate, travelers) =>
    `https://tickets.vueling.com/booking?o=${originIata}&d=${destinationIata}&dd=${departureDate}&rd=${returnDate}&adt=${travelers}&chd=0&inf=0&c=es-ES&cur=EUR`,
};

function buildGoogleFlightsLink(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
): string {
  const query = `Flights from ${origin} to ${destination} on ${departureDate} through ${returnDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export interface FlightLinkParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  airline?: string;
}

export function getFlightLink(params: FlightLinkParams): string {
  const { origin, destination, departureDate, returnDate, travelers, airline } = params;
  const buildAirlineLink = airline ? AIRLINE_LINK_BUILDERS[airline] : undefined;
  const originIata = buildAirlineLink ? lookupIata(origin) : undefined;
  const destinationIata = buildAirlineLink ? lookupIata(destination) : undefined;

  if (buildAirlineLink && originIata && destinationIata) {
    return buildAirlineLink(originIata, destinationIata, departureDate, returnDate, travelers);
  }

  return buildGoogleFlightsLink(origin, destination, departureDate, returnDate);
}

export function getHotelLink(
  hotelName: string,
  city: string,
  checkin: string,
  checkout: string,
  guests: number,
): string {
  const params = new URLSearchParams({
    ss: `${hotelName}, ${city}`,
    checkin,
    checkout,
    group_adults: String(guests),
    no_rooms: "1",
    group_children: "0",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export function getActivityLink(activityName: string, city: string): string {
  const query = `${activityName}, ${city}`;
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(query)}`;
}

export function getGoogleMapsLink(placeName: string, city: string): string {
  const query = `${placeName} ${city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
