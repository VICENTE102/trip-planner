import { Link } from "react-router-dom";
import type { Trip } from "../types";
import { Icon } from "./Icon";
import { TIER_THEME } from "../constants/tierTheme";
import { formatDateRange } from "../utils/dates";

interface TripCardProps {
  trip: Trip;
  onDelete: () => void;
}

export function TripCard({ trip, onDelete }: TripCardProps) {
  const { searchParams, proposal } = trip;
  const theme = TIER_THEME[proposal.tier];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition hover:shadow-md">
      <div className={`h-1.5 w-full ${theme.solidBg}`} />
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/mis-viajes/${trip.id}`} className="flex-1">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${theme.badge}`}>
            {theme.label}
          </span>
          <h3 className="mt-2 flex items-center gap-1.5 font-semibold text-ink-900">
            <Icon name="mapPin" size={16} className="text-sunset-500" />
            {searchParams.destination}
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {formatDateRange(searchParams.departureDate, searchParams.returnDate)} ·{" "}
            {proposal.itinerary.totalNights} noches
          </p>
          <p className="text-sm text-ink-700">{proposal.hotel.name}</p>
          <p className="mt-1 text-lg font-bold text-ink-900">{proposal.economicSummary.total}€</p>
        </Link>
        <button
          type="button"
          onClick={onDelete}
          className="mt-3 self-start rounded-lg bg-sunset-50 px-3 py-1.5 text-sm font-semibold text-sunset-700 transition hover:bg-sunset-100"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
