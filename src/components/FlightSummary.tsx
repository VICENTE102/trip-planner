import type { Itinerary, SearchParams } from "../types";
import { Icon } from "./Icon";
import { ExternalLinkButton } from "./ExternalLinkButton";
import { getFlightLink } from "../services/deepLinks";

interface FlightSummaryProps {
  itinerary: Itinerary;
  searchParams: SearchParams;
}

export function FlightSummary({ itinerary, searchParams }: FlightSummaryProps) {
  const { outboundFlight, returnFlight } = itinerary;

  if (!outboundFlight || !returnFlight) {
    return <p className="text-sm text-ink-500">No hay datos de vuelo simulados para este viaje.</p>;
  }

  const flightBookingUrl = getFlightLink({
    origin: searchParams.origin,
    destination: searchParams.destination,
    departureDate: searchParams.departureDate,
    returnDate: searchParams.returnDate,
    travelers: searchParams.travelers + searchParams.children,
    airline: outboundFlight.airline,
  });

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 text-sm">
      <p className="flex items-center gap-1.5 font-semibold text-ink-900">
        <Icon name="plane" size={16} className="text-sunset-500" />
        Vuelos (simulados)
      </p>
      <p className="mt-2 text-ink-700">
        <span className="font-semibold text-ink-900">Ida</span> · {outboundFlight.airline} ·{" "}
        {outboundFlight.departureTime}–{outboundFlight.arrivalTime} ·{" "}
        {outboundFlight.stops === 0 ? "directo" : `${outboundFlight.stops} escala(s)`} ·{" "}
        {outboundFlight.price}€
      </p>
      <p className="text-ink-700">
        <span className="font-semibold text-ink-900">Vuelta</span> · {returnFlight.airline} ·{" "}
        {returnFlight.departureTime}–{returnFlight.arrivalTime} ·{" "}
        {returnFlight.stops === 0 ? "directo" : `${returnFlight.stops} escala(s)`} · {returnFlight.price}€
      </p>
      <div className="mt-3">
        <ExternalLinkButton href={flightBookingUrl} label="Reservar vuelo" icon="plane" variant="primary" />
      </div>
    </div>
  );
}
