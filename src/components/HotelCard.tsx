import type { Hotel } from "../types";
import { ExternalLinkButton } from "./ExternalLinkButton";

interface HotelCardProps {
  hotel: Hotel;
  selected?: boolean;
  onSelect?: () => void;
  bookingUrl?: string;
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

export function HotelCard({ hotel, selected, onSelect, bookingUrl }: HotelCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        selected ? "border-lagoon-500 ring-1 ring-lagoon-500" : "border-ink-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_BADGE_CLASSES[hotel.tier]}`}>
          {TIER_LABELS[hotel.tier]}
        </span>
        <span className="text-xs text-sunset-500">{"★".repeat(hotel.stars)}</span>
      </div>

      <h3 className="mt-2 font-semibold text-ink-900">{hotel.name}</h3>
      <p className="text-xs text-ink-500">Valoración {hotel.rating.toFixed(1)} / 5</p>

      <p className="mt-1 text-sm text-ink-700">{hotel.amenities.join(" · ")}</p>

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
          <ExternalLinkButton href={bookingUrl} label="Reservar hotel" variant="primary" />
        </div>
      )}
    </div>
  );
}
