import type { EconomicSummary } from "../types";

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-700">{label}</dt>
      <dd className="text-ink-900">{amount}€</dd>
    </div>
  );
}

export function EconomicSummaryView({ summary }: { summary: EconomicSummary }) {
  const isOverBudget = summary.remaining < 0;
  // El motor del backend reparte el presupuesto en 7 partidas; el generador
  // antiguo del cliente solo en 4. Las filas extra se pintan únicamente si
  // vienen, para que la suma de lo que se ve cuadre siempre con el TOTAL.
  const includesInsurance = summary.insurance !== undefined;

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3 text-sm">
      <dl className="flex flex-col gap-1.5">
        <Row label="Alojamiento" amount={summary.accommodation} />
        {summary.mainTransport !== undefined && <Row label="Vuelos" amount={summary.mainTransport} />}
        <Row label="Comidas (estimado)" amount={summary.meals} />
        <Row
          label={
            summary.mainTransport !== undefined ? "Transporte local (estimado)" : "Transporte (estimado)"
          }
          amount={summary.transport}
        />
        <Row label="Entradas y actividades (estimado)" amount={summary.activities} />
        {summary.insurance !== undefined && <Row label="Seguro de viaje" amount={summary.insurance} />}
        {summary.emergencyReserve !== undefined && (
          <Row label="Reserva de emergencia" amount={summary.emergencyReserve} />
        )}
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
        {includesInsurance
          ? "Estimación orientativa. No incluye propinas u otros extras."
          : "Estimación orientativa. No incluye seguro de viaje, propinas u otros extras."}
      </p>
    </div>
  );
}
