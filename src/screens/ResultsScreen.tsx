import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { SearchParams, TierLevel, Trip } from "../types";
import type { GenerateTripResponse } from "../services/trip-api.client";
import { toSearchResult } from "../services/tripAdapter";
import { ProposalDetailView } from "../components/ProposalDetailView";
import { ProposalCompareRow } from "../components/ProposalCompareRow";
import { Tabs } from "../components/Tabs";
import type { TabItem } from "../components/Tabs";
import { TrailDecoration } from "../components/TrailDecoration";
import { Icon } from "../components/Icon";
import { useTrips } from "../hooks/useTrips";
import { useDestinationImage } from "../hooks/useDestinationImage";
import { TIER_THEME } from "../constants/tierTheme";
import { track } from "../services/analytics";

interface ResultsLocationState {
  searchParams: SearchParams;
  generation: GenerateTripResponse;
}

const CATEGORY_TO_TIER: Record<SearchParams["category"], TierLevel> = {
  economico: "barato",
  equilibrado: "medio",
  comodo: "caro",
};

export function ResultsScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveTrip } = useTrips();
  const state = location.state as ResultsLocationState | null;

  const searchResult = useMemo(
    () => (state?.searchParams && state.generation ? toSearchResult(state.generation, state.searchParams) : null),
    [state],
  );

  // El motor devuelve solo las propuestas que sobreviven a la validación:
  // pueden ser 3, 2, 1 o ninguna. La pestaña preseleccionada es la que pidió
  // el usuario solo si existe de verdad; si no, se abre la comparativa.
  const requestedTier = searchResult ? CATEGORY_TO_TIER[searchResult.searchParams.category] : undefined;
  const hasRequestedTier = !!searchResult?.proposals.some((p) => p.tier === requestedTier);
  const [activeTab, setActiveTab] = useState<string>(
    hasRequestedTier && requestedTier ? requestedTier : "comparativa",
  );
  const heroImage = useDestinationImage(searchResult?.searchParams.destination ?? "");

  if (!searchResult) {
    return <Navigate to="/" replace />;
  }

  const { searchParams, proposals, disclaimer, budgetUnlock } = searchResult;
  const hasProposals = proposals.length > 0;
  const cheapestTotal = hasProposals ? Math.min(...proposals.map((p) => p.economicSummary.total)) : null;
  const activeProposal = proposals.find((p) => p.tier === activeTab);
  const cheapestEvaluated = state?.generation.metadata.cheapestTotalCost ?? null;

  function handleSaveTrip(tier: TierLevel) {
    const proposal = proposals.find((p) => p.tier === tier)!;
    const trip: Trip = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      searchParams,
      proposal,
    };
    saveTrip(trip);
    track("viaje_guardado", { destino: searchParams.destination, tier, coste: proposal.economicSummary.total });
    navigate("/mis-viajes");
  }

  const tabs: TabItem[] = [
    { id: "comparativa", label: "Comparativa", icon: "compass" },
    ...proposals.map((proposal) => ({
      id: proposal.tier,
      label: TIER_THEME[proposal.tier].label,
      activeBgClass: TIER_THEME[proposal.tier].solidBg,
      markerColorClass: TIER_THEME[proposal.tier].accentText,
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
            {searchParams.returnDate} · {searchParams.travelers + searchParams.children} viajero
            {searchParams.travelers + searchParams.children > 1 ? "s" : ""}
          </p>
          <p className="mt-1 text-lg font-semibold lg:text-xl">
            {cheapestTotal !== null ? `Propuestas desde ${cheapestTotal}€` : "Sin propuestas para este presupuesto"}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden bg-white">
        <TrailDecoration side="left" />
        <TrailDecoration side="right" />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-4">
          {!hasProposals ? (
            <div className="animate-slide-in-trail mx-auto max-w-xl py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sunset-100 text-sunset-600">
                <Icon name="compass" size={28} />
              </div>
              <h2 className="mt-4 font-heading text-2xl font-bold text-ink-900">
                No hay ningún viaje que quepa en tu presupuesto
              </h2>
              {cheapestEvaluated !== null ? (
                <p className="mt-2 text-ink-700">
                  La opción más económica para este viaje son{" "}
                  <span className="font-bold text-ink-900">{cheapestEvaluated}€</span>,{" "}
                  {cheapestEvaluated - searchParams.budget}€ por encima de tus {searchParams.budget}€.
                </p>
              ) : (
                <p className="mt-2 text-ink-700">
                  No se ha encontrado ninguna combinación de vuelo y alojamiento para estas fechas.
                </p>
              )}
              {/* Con cero propuestas es cuando más ayuda una cifra concreta:
                  ya se dice cuánto cuesta lo más barato, y esto añade cuántas
                  opciones se abren, que es lo que responde "¿y si subo un
                  poco?". */}
              {budgetUnlock && budgetUnlock.unlockedOptions > 0 ? (
                <p className="mt-2 text-sm text-ink-700">
                  Con <span className="font-bold text-ink-900">{budgetUnlock.extraBudget}€ más</span> podrías elegir
                  entre{" "}
                  <span className="font-bold text-ink-900">
                    {budgetUnlock.unlockedOptions} alojamiento
                    {budgetUnlock.unlockedOptions > 1 ? "s" : ""}
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-500">
                  Prueba a subir el presupuesto, acortar el viaje o cambiar las fechas.
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-6 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              >
                Cambiar la búsqueda
              </button>
            </div>
          ) : (
            <>
              <Tabs
                tabs={tabs}
                activeId={activeTab}
                onChange={(id) => {
                  setActiveTab(id);
                  track("propuesta_abierta", { destino: searchParams.destination, propuesta: id });
                }}
              />

              <div key={activeTab} className="animate-slide-in-trail pb-8">
                {activeTab === "comparativa" ? (
                  <div className="flex flex-col gap-3">
                    {/* Cuando el presupuesto solo da para un alojamiento, el
                        motor devuelve menos propuestas en vez de repetir el
                        mismo viaje con tres etiquetas. Entonces hay que decir
                        por qué y qué haría falta: "no hay más opciones" a
                        secas sería peor que las tres cajas repetidas. */}
                    {budgetUnlock && (
                      <div className="rounded-2xl border border-sunset-200 bg-sunset-50/60 p-4">
                        <p className="flex items-start gap-2 text-sm font-semibold text-ink-900">
                          <Icon name="compass" size={16} className="mt-0.5 flex-none text-sunset-600" />
                          <span>
                            {budgetUnlock.currentOptions <= 1
                              ? "Con este presupuesto solo hay un alojamiento disponible"
                              : `Con este presupuesto hay ${budgetUnlock.currentOptions} alojamientos disponibles`}
                          </span>
                        </p>
                        <p className="mt-1.5 pl-6 text-sm text-ink-700">
                          Con{" "}
                          <span className="font-bold text-ink-900">{budgetUnlock.extraBudget}€ más</span> (
                          {searchParams.budget + budgetUnlock.extraBudget}€ en total) podrías elegir entre{" "}
                          <span className="font-bold text-ink-900">
                            {budgetUnlock.unlockedOptions} alojamientos
                          </span>
                          .
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/")}
                          className="mt-3 ml-6 rounded-full bg-ink-900 px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                        >
                          Cambiar la búsqueda
                        </button>
                      </div>
                    )}

                    {disclaimer && (
                      <p className="flex items-start gap-1.5 px-1 text-xs text-ink-500">
                        <Icon name="alert" size={13} className="mt-0.5 flex-none text-ink-400" />
                        <span>{disclaimer}</span>
                      </p>
                    )}
                    {proposals.map((proposal) => (
                      <ProposalCompareRow
                        key={proposal.tier}
                        proposal={proposal}
                        onViewDetail={() => {
                          setActiveTab(proposal.tier);
                          track("propuesta_abierta", {
                            destino: searchParams.destination,
                            propuesta: proposal.tier,
                            desde: "comparativa",
                          });
                        }}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
