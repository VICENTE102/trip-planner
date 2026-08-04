import type { TripProposal } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { Icon } from "./Icon";

interface ProposalCompareRowProps {
  proposal: TripProposal;
  onViewDetail: () => void;
}

export function ProposalCompareRow({ proposal, onViewDetail }: ProposalCompareRowProps) {
  const { tier, hotel, itinerary, economicSummary } = proposal;
  const theme = TIER_THEME[tier];
  const highlightDay = itinerary.days.find((day) => !day.isArrivalDay) ?? itinerary.days[0];
  const isOverBudget = economicSummary.remaining < 0;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border ${theme.border}/40 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center`}
    >
      <div className="sm:w-52 sm:flex-none">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${theme.badge}`}>
          {theme.label}
        </span>
        <p className="mt-1 font-semibold text-ink-900">{hotel.name}</p>
        <p className="text-xs text-ink-500">
          {"★".repeat(hotel.stars)} · {hotel.rating.toFixed(1)}/5
        </p>
      </div>

      <div className="flex-1 text-sm text-ink-700">
        <p className="flex items-center gap-1.5">
          <Icon name="sun" size={14} className="flex-none text-sunset-500" />
          {highlightDay.morning}
        </p>
        <p className="mt-1 flex items-center gap-1.5">
          <Icon name="compass" size={14} className="flex-none text-lagoon-600" />
          {highlightDay.afternoon}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 sm:w-44 sm:flex-none sm:flex-col sm:items-end">
        <div className="text-right">
          <p className="text-xl font-bold text-ink-900">{economicSummary.total}€</p>
          <p className={`text-xs font-semibold ${isOverBudget ? "text-sunset-700" : "text-lagoon-700"}`}>
            {isOverBudget
              ? `Excede en ${Math.abs(economicSummary.remaining)}€`
              : `Sobran ${economicSummary.remaining}€`}
          </p>
        </div>
        <button
          type="button"
          onClick={onViewDetail}
          className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${theme.solidBg}`}
        >
          Ver detalle
        </button>
      </div>
    </div>
  );
}
