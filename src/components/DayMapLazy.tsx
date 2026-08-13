import { Suspense, lazy } from "react";
import type { DayStop, TierLevel } from "../types";

// MapLibre es la dependencia más pesada del frontend después del generador
// de PDF. Cargarla con import() la saca del bundle principal, para que quien
// solo use el buscador no se descargue un motor de mapas que no va a abrir.
// Mismo patrón que el PDF en ProposalDetailView.tsx.
const DayMap = lazy(() => import("./DayMap").then((module) => ({ default: module.DayMap })));

const placeholder = (
  <div className="flex h-[420px] items-center justify-center rounded-2xl border border-ink-200 bg-ink-50 lg:h-full">
    <p className="text-sm text-ink-500">Cargando el mapa…</p>
  </div>
);

export function DayMapLazy(props: { stops: DayStop[]; tier: TierLevel }) {
  return <Suspense fallback={placeholder}>{<DayMap {...props} />}</Suspense>;
}
