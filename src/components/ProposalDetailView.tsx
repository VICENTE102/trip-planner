import { useState } from "react";
import type { SearchParams, TripProposal } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";
import { HotelCard } from "./HotelCard";
import { FlightSummary } from "./FlightSummary";
import { ItineraryPreview } from "./ItineraryPreview";
import { EconomicSummaryView } from "./EconomicSummaryView";
import { getHotelLink } from "../services/deepLinks";

interface ProposalDetailViewProps {
  proposal: TripProposal;
  searchParams: SearchParams;
  onSave?: () => void;
}

const SECTIONS: TabItem[] = [
  { id: "itinerario", label: "Itinerario completo", icon: "sun" },
  { id: "alojamiento", label: "Alojamiento", icon: "suitcase" },
  { id: "vuelos", label: "Vuelos", icon: "plane" },
  { id: "gastos", label: "Gastos", icon: "compass" },
];

export function ProposalDetailView({ proposal, searchParams, onSave }: ProposalDetailViewProps) {
  const [section, setSection] = useState("itinerario");
  const { tier, hotel, itinerary, economicSummary } = proposal;
  const theme = TIER_THEME[tier];
  const isOverBudget = economicSummary.remaining < 0;

  const sectionTabs: TabItem[] = SECTIONS.map((tab) => ({
    ...tab,
    activeBgClass: theme.solidBg,
    markerColorClass: theme.accentText,
  }));

  const hotelBookingUrl = getHotelLink(
    hotel.name,
    searchParams.destination,
    searchParams.departureDate,
    searchParams.returnDate,
    searchParams.travelers + searchParams.children,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
      <div
        className={`flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between ${theme.softBg}`}
      >
        <div>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${theme.badge}`}>
            Viaje {theme.label}
          </span>
          <p className="mt-1 text-lg font-semibold text-ink-900">{hotel.name}</p>
          <p className="text-sm text-ink-500">
            {itinerary.totalDays} días · {itinerary.totalNights} noches
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-ink-900">{economicSummary.total}€</p>
            <p className={`text-xs font-semibold ${isOverBudget ? "text-sunset-700" : "text-lagoon-700"}`}>
              {isOverBudget
                ? `Excede en ${Math.abs(economicSummary.remaining)}€`
                : `Sobran ${economicSummary.remaining}€`}
            </p>
          </div>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className={`rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 ${theme.solidBg}`}
            >
              Guardar viaje
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-3">
        <Tabs tabs={sectionTabs} activeId={section} onChange={setSection} />
      </div>

      <div
        key={section}
        className={`animate-slide-in-trail p-4 ${section === "itinerario" ? "" : "max-w-2xl"}`}
      >
        {section === "itinerario" && (
          <ItineraryPreview itinerary={itinerary} searchParams={searchParams} tier={tier} />
        )}
        {section === "alojamiento" && <HotelCard hotel={hotel} bookingUrl={hotelBookingUrl} />}
        {section === "vuelos" && <FlightSummary itinerary={itinerary} searchParams={searchParams} />}
        {section === "gastos" && <EconomicSummaryView summary={economicSummary} />}
      </div>
    </div>
  );
}
