import type { Hotel } from "../types";
import { DataBadge } from "./DataBadge";
import { ExternalLinkButton } from "./ExternalLinkButton";
import { Icon } from "./Icon";
import { formatDistance } from "../utils/format";

interface HotelCardProps {
  hotel: Hotel;
  selected?: boolean;
  onSelect?: () => void;
  bookingUrl?: string;
  // Solo para la medición del clic de reserva; la tarjeta no lo pinta.
  destination?: string;
}

const TIER_LABELS: Record<Hotel["tier"], string> = {
  barato: "Económico",
  medio: "Equilibrado",
  caro: "Cómodo",
};

const TIER_BADGE_CLASSES: Record<Hotel["tier"], string> = {
  barato: "bg-lagoon-100 text-lagoon-700",
  medio: "bg-sunset-100 text-sunset-700",
  caro: "bg-ink-900 text-sunset-100",
};

export function HotelCard({ hotel, selected, onSelect, bookingUrl, destination }: HotelCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        selected ? "border-lagoon-500 ring-1 ring-lagoon-500" : "border-ink-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_BADGE_CLASSES[hotel.tier]}`}>
          {TIER_LABELS[hotel.tier]}
        </span>
        {/* Aquí iban unas estrellas derivadas de la valoración: el mismo
            número dos veces, y disfrazado de categoría hotelera. La marca de
            simulado dice algo que el usuario no podía saber; las estrellas,
            no decían nada. */}
        <DataBadge confidence="simulado" linkToSources />
      </div>

      <h3 className="mt-2 font-semibold text-ink-900">{hotel.name}</h3>
      <p className="text-xs text-ink-500">Valoración {hotel.rating.toFixed(1)} / 5</p>

      {/* Tres datos que el motor ya calculaba y la ficha no enseñaba. La
          cancelación gratuita solo aparecía cuando FALTABA, en los avisos:
          quien la tenía no se enteraba. */}
      {(hotel.distanceToCenterKm !== undefined ||
        hotel.freeCancellation !== undefined ||
        hotel.breakfastIncluded !== undefined) && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {hotel.distanceToCenterKm !== undefined && (
            <li className="flex items-center gap-1 text-ink-600">
              <Icon name="mapPin" size={12} className="flex-none text-ink-400" />
              A {formatDistance(hotel.distanceToCenterKm)} del centro
            </li>
          )}
          {hotel.freeCancellation !== undefined && (
            <li className={`flex items-center gap-1 ${hotel.freeCancellation ? "text-lagoon-700" : "text-ink-500"}`}>
              <Icon name={hotel.freeCancellation ? "check" : "alert"} size={12} className="flex-none" />
              {hotel.freeCancellation ? "Cancelación gratuita" : "Sin cancelación gratuita"}
            </li>
          )}
          {hotel.breakfastIncluded !== undefined && (
            <li className={`flex items-center gap-1 ${hotel.breakfastIncluded ? "text-lagoon-700" : "text-ink-500"}`}>
              <Icon name={hotel.breakfastIncluded ? "check" : "alert"} size={12} className="flex-none" />
              {hotel.breakfastIncluded ? "Desayuno incluido" : "Desayuno no incluido"}
            </li>
          )}
        </ul>
      )}

      {hotel.amenities.length > 0 && <p className="mt-2 text-sm text-ink-700">{hotel.amenities.join(" · ")}</p>}

      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-lg font-semibold text-ink-900">{hotel.pricePerNight}€ / noche</p>
          <p className="text-xs text-ink-500">Total: {hotel.totalPrice}€</p>
        </div>
        {onSelect && (
          <button
            type="button"
            onClick={onSelect}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              selected ? "bg-lagoon-500 text-white" : "bg-ink-200/60 text-ink-700"
            }`}
          >
            {selected ? "Seleccionado" : "Elegir"}
          </button>
        )}
      </div>

      {bookingUrl && (
        <div className="mt-2">
          <ExternalLinkButton
            href={bookingUrl}
            label="Reservar hotel"
            variant="primary"
            category="alojamiento"
            destination={destination}
          />
        </div>
      )}
    </div>
  );
}
