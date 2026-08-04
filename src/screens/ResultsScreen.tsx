import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { SearchParams, TierLevel, Trip } from "../types";
import { buildSearchResult } from "../services/searchService";
import { ProposalDetailView } from "../components/ProposalDetailView";
import { ProposalCompareRow } from "../components/ProposalCompareRow";
import { Tabs } from "../components/Tabs";
import type { TabItem } from "../components/Tabs";
import { Icon } from "../components/Icon";
import { useTrips } from "../hooks/useTrips";
import { useDestinationImage } from "../hooks/useDestinationImage";
import { TIER_THEME } from "../constants/tierTheme";

interface ResultsLocationState {
  searchParams: SearchParams;
}

const CATEGORY_TO_TIER: Record<SearchParams["category"], TierLevel | null> = {
  economico: "barato",
  equilibrado: "medio",
  comodo: "caro",
  sorprendeme: null,
};

const TIER_ORDER: TierLevel[] = ["barato", "medio", "caro"];

export function ResultsScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveTrip } = useTrips();
  const state = location.state as ResultsLocationState | null;

  const searchResult = useMemo(
    () => (state?.searchParams ? buildSearchResult(state.searchParams) : null),
    [state],
  );

  const highlightedTier = searchResult ? CATEGORY_TO_TIER[searchResult.searchParams.category] : null;
  const [activeTab, setActiveTab] = useState<string>(highlightedTier ?? "comparativa");
  const heroImage = useDestinationImage(searchResult?.searchParams.destination ?? "");

  if (!searchResult) {
    return <Navigate to="/" replace />;
  }

  const { searchParams, proposals } = searchResult;
  const cheapestTotal = Math.min(...proposals.map((p) => p.economicSummary.total));
  const activeProposal = proposals.find((p) => p.tier === activeTab);

  function handleSaveTrip(tier: TierLevel) {
    const proposal = proposals.find((p) => p.tier === tier)!;
    const trip: Trip = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      searchParams,
      proposal,
    };
    saveTrip(trip);
    navigate("/mis-viajes");
  }

  const tabs: TabItem[] = [
    { id: "comparativa", label: "Comparativa", icon: "compass" },
    ...TIER_ORDER.map((tier) => ({
      id: tier,
      label: TIER_THEME[tier].label,
      activeClassName: TIER_THEME[tier].tabActive,
    })),
  ];

  return (
    <div>
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-sunset-600 to-lagoon-600" />
        {heroImage && (
          <img
            src={heroImage}
            alt={searchParams.destination}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Darker at top (nav legibility) and bottom (title legibility), lighter through the middle */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/10 to-ink-900/80" />
        {/* Smooth hand-off into the white content area below, instead of a hard cut */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 pb-24 text-white lg:pb-28">
          <h1 className="flex items-center gap-2 font-heading text-3xl font-bold lg:text-5xl">
            <Icon name="mapPin" size={26} />
            {searchParams.destination}
          </h1>
          <p className="text-white/85 lg:text-lg">
            {searchParams.origin} → {searchParams.destination} · {searchParams.departureDate} →{" "}
            {searchParams.returnDate} · {searchParams.travelers} viajero
            {searchParams.travelers > 1 ? "s" : ""}
          </p>
          <p className="mt-1 text-lg font-semibold lg:text-xl">Propuestas desde {cheapestTotal}€</p>
        </div>
      </div>

      <div className="bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

          <div className="mt-4 pb-8">
            {activeTab === "comparativa" ? (
              <div className="flex flex-col gap-3">
                {proposals.map((proposal) => (
                  <ProposalCompareRow
                    key={proposal.tier}
                    proposal={proposal}
                    onViewDetail={() => setActiveTab(proposal.tier)}
                  />
                ))}
              </div>
            ) : activeProposal ? (
              <ProposalDetailView
                proposal={activeProposal}
                searchParams={searchParams}
                onSave={() => handleSaveTrip(activeProposal.tier)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
