import { useState } from "react";
import type { ItineraryDay, SearchParams, TripProposal } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";
import { HotelCard } from "./HotelCard";
import { FlightSummary } from "./FlightSummary";
import { ItineraryPreview } from "./ItineraryPreview";
import { DayByDayView } from "./DayByDayView";
import { EconomicSummaryView } from "./EconomicSummaryView";
import { Icon } from "./Icon";
import { getHotelLink } from "../services/deepLinks";
import { useDestinationImage } from "../hooks/useDestinationImage";
import { normalizeCityName } from "../utils/text";
import { track } from "../services/analytics";

interface ProposalDetailViewProps {
  proposal: TripProposal;
  searchParams: SearchParams;
  onSave?: () => void;
  editable?: boolean;
  onUpdateDay?: (day: ItineraryDay) => void;
}

const SECTIONS: TabItem[] = [
  { id: "itinerario", label: "Itinerario completo", icon: "sun" },
  { id: "dia-a-dia", label: "Día a día", icon: "mapPin" },
  { id: "alojamiento", label: "Alojamiento", icon: "suitcase" },
  { id: "vuelos", label: "Vuelos", icon: "plane" },
  { id: "gastos", label: "Gastos", icon: "compass" },
];

export function ProposalDetailView({
  proposal,
  searchParams,
  onSave,
  editable,
  onUpdateDay,
}: ProposalDetailViewProps) {
  const [section, setSection] = useState("itinerario");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { tier, hotel, itinerary, economicSummary, reasons, warnings } = proposal;
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

  const heroImage = useDestinationImage(searchParams.destination);
  const pdfFileName = `viaje-${normalizeCityName(searchParams.destination).replace(/\s+/g, "-")}-${tier}.pdf`;

  // @react-pdf/renderer arrastra su propio motor de fuentes/layout (varios
  // cientos de KB) — se carga bajo demanda para no pesar en el bundle
  // principal a usuarios que nunca descargan el PDF.
  async function handleDownloadPdf() {
    setIsGeneratingPdf(true);
    track("pdf_descargado", { destino: searchParams.destination, propuesta: tier });
    try {
      const [{ pdf }, { TripPdfDocument }, { downscaleImageForPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/TripPdfDocument"),
        import("./pdf/downscaleImage"),
      ]);
      const heroImageForPdf = heroImage ? await downscaleImageForPdf(heroImage) : null;
      const blob = await pdf(
        <TripPdfDocument proposal={proposal} searchParams={searchParams} heroImageUrl={heroImageForPdf} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

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
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
          >
            <Icon name="download" size={15} />
            {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
          </button>

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

      {(reasons.length > 0 || warnings.length > 0) && (
        <div className="border-t border-ink-100 px-4 pt-3">
          <ul className="flex flex-col gap-1 text-sm text-ink-700 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-1.5">
                <Icon name="check" size={14} className="mt-0.5 flex-none text-lagoon-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          {warnings.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-1 text-xs text-ink-500 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {warnings.map((warning) => (
                <li key={warning} className="flex items-start gap-1.5">
                  <Icon name="alert" size={13} className="mt-0.5 flex-none text-sunset-500" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="px-4 pt-3">
        <Tabs
          tabs={sectionTabs}
          activeId={section}
          onChange={(id) => {
            setSection(id);
            track("pestana_vista", { destino: searchParams.destination, propuesta: tier, seccion: id });
          }}
        />
      </div>

      <div
        key={section}
        className={`animate-slide-in-trail p-4 ${section === "itinerario" || section === "dia-a-dia" ? "" : "max-w-2xl"}`}
      >
        {section === "itinerario" && (
          <ItineraryPreview
            itinerary={itinerary}
            searchParams={searchParams}
            tier={tier}
            editable={editable}
            onUpdateDay={onUpdateDay}
          />
        )}
        {section === "dia-a-dia" && (
          <DayByDayView
            itinerary={itinerary}
            searchParams={searchParams}
            tier={tier}
            editable={editable}
            onUpdateDay={onUpdateDay}
          />
        )}
        {section === "alojamiento" && (
          <HotelCard hotel={hotel} bookingUrl={hotelBookingUrl} destination={searchParams.destination} />
        )}
        {section === "vuelos" && <FlightSummary itinerary={itinerary} searchParams={searchParams} />}
        {section === "gastos" && <EconomicSummaryView summary={economicSummary} />}
      </div>
    </div>
  );
}
