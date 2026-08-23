import type { Itinerary, SearchParams } from "../types";
import { DataBadge } from "./DataBadge";
import { Icon } from "./Icon";
import { ExternalLinkButton } from "./ExternalLinkButton";
import { getFlightLink } from "../services/deepLinks";

interface FlightSummaryProps {
  itinerary: Itinerary;
  searchParams: SearchParams;
}

export function FlightSummary({ itinerary, searchParams }: FlightSummaryProps) {
  const { outboundFlight, returnFlight, flightsTotalPrice } = itinerary;

  if (!outboundFlight || !returnFlight) {
    return <p className="text-sm text-ink-500">No hay datos de vuelo simulados para este viaje.</p>;
  }

  // El precio va por trayecto (generador antiguo) o una sola vez para ida y
  // vuelta (motor real). Nunca las dos cosas, para no enseñar el doble.
  const legPrice = (price?: number) => (price !== undefined ? ` · ${price}€` : "");

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
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink-900">
        <span className="flex items-center gap-1.5">
          <Icon name="plane" size={16} className="text-sunset-500" />
          Vuelos
        </span>
        {/* "(simulados)" entre paréntesis en el título se leía como un matiz.
            La marca dice lo mismo con el peso que le corresponde y, al
            enlazar a /fuentes, explica hasta dónde llega. */}
        <DataBadge confidence="simulado" />
      </p>
      <p className="mt-2 text-ink-700">
        <span className="font-semibold text-ink-900">Ida</span> · {outboundFlight.airline} ·{" "}
        {outboundFlight.departureTime}–{outboundFlight.arrivalTime} ·{" "}
        {outboundFlight.stops === 0 ? "directo" : `${outboundFlight.stops} escala(s)`}
        {legPrice(outboundFlight.price)}
      </p>
      <p className="text-ink-700">
        <span className="font-semibold text-ink-900">Vuelta</span> · {returnFlight.airline} ·{" "}
        {returnFlight.departureTime}–{returnFlight.arrivalTime} ·{" "}
        {returnFlight.stops === 0 ? "directo" : `${returnFlight.stops} escala(s)`}
        {legPrice(returnFlight.price)}
      </p>
      {flightsTotalPrice !== undefined && (
        <p className="mt-2 font-semibold text-ink-900">
          Ida y vuelta, {searchParams.travelers + searchParams.children} viajero
          {searchParams.travelers + searchParams.children > 1 ? "s" : ""}: {flightsTotalPrice}€
        </p>
      )}
      <div className="mt-3">
        <ExternalLinkButton
          href={flightBookingUrl}
          label="Reservar vuelo"
          icon="plane"
          variant="primary"
          category="vuelo"
          destination={searchParams.destination}
        />
      </div>
    </div>
  );
}
