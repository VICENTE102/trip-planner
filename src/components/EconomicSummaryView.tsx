import type { EconomicSummary } from "../types";

export function EconomicSummaryView({ summary }: { summary: EconomicSummary }) {
  const isOverBudget = summary.remaining < 0;

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3 text-sm">
      <dl className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <dt className="text-ink-700">Alojamiento</dt>
          <dd className="text-ink-900">{summary.accommodation}€</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-700">Comidas (estimado)</dt>
          <dd className="text-ink-900">{summary.meals}€</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-700">Transporte (estimado)</dt>
          <dd className="text-ink-900">{summary.transport}€</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-700">Entradas y actividades (estimado)</dt>
          <dd className="text-ink-900">{summary.activities}€</dd>
        </div>
      </dl>

      <div className="mt-2 flex justify-between border-t border-ink-200 pt-2 font-bold text-ink-900">
        <span>TOTAL</span>
        <span>{summary.total}€</span>
      </div>

      <div
        className={`flex justify-between font-semibold ${
          isOverBudget ? "text-sunset-700" : "text-lagoon-700"
        }`}
      >
        <span>{isOverBudget ? "Excedido respecto al presupuesto" : "Restante del presupuesto"}</span>
        <span>{Math.abs(summary.remaining)}€</span>
      </div>

      <p className="mt-2 text-xs text-ink-500">
        Estimación orientativa. No incluye seguro de viaje, propinas u otros extras.
      </p>
    </div>
  );
}
