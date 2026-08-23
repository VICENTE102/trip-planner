import type { TripProposal } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { DataBadge } from "./DataBadge";
import { Icon } from "./Icon";

interface ProposalCompareRowProps {
  proposal: TripProposal;
  onViewDetail: () => void;
}

// Cuántas razones caben sin que la fila crezca de más.
const MAX_REASONS = 3;

export function ProposalCompareRow({ proposal, onViewDetail }: ProposalCompareRowProps) {
  const { tier, hotel, economicSummary, distinguishingReasons, warnings } = proposal;
  const theme = TIER_THEME[tier];
  const isOverBudget = economicSummary.remaining < 0;

  // Aquí antes se pintaba la mañana y la tarde del primer día. No comparaba
  // nada —las tres propuestas compartían actividades— y con nombres reales
  // salían cosas como "La Piccola Abbazia · Accademia Materiaviva - Scuola
  // di teatro e circo - Roma". Las razones sí distinguen una opción de otra.
  //
  // SOLO las que distinguen, aunque la fila quede con dos líneas y la de al
  // lado con tres. Rellenar el hueco con una razón común —"La afinidad con
  // la cultura y la gastronomía es alta", que sale igual en las tres— la
  // haría parecer un argumento propio de esa opción cuando no lo es. Las
  // comunes siguen estando, completas, en el detalle.
  const shown = distinguishingReasons.slice(0, MAX_REASONS);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border ${theme.border}/40 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center`}
    >
      <div className="sm:w-52 sm:flex-none">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${theme.badge}`}>
          {theme.label}
        </span>
        <p className="mt-1 font-semibold text-ink-900">{hotel.name}</p>
        {/* Antes: {"★".repeat(hotel.stars)} · {rating}/5 — las estrellas se
            derivaban de la propia valoración, así que era el mismo número dos
            veces y el primero fingiendo ser una categoría hotelera. */}
        <p className="mt-0.5 text-xs text-ink-500">Valoración {hotel.rating.toFixed(1)}/5</p>
        <DataBadge confidence="simulado" className="mt-1.5" linkToSources />
      </div>

      <div className="flex-1">
        <ul className="flex flex-col gap-1 text-sm text-ink-700">
          {shown.map((reason) => (
            <li key={reason} className="flex items-start gap-1.5">
              <Icon name="check" size={14} className="mt-0.5 flex-none text-lagoon-600" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>

        {warnings.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-500">
            <Icon name="alert" size={13} className="mt-0.5 flex-none text-sunset-500" />
            <span>{warnings[0]}</span>
          </p>
        )}
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
