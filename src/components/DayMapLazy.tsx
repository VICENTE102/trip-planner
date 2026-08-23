import { Suspense, lazy } from "react";
import type { DayStop, TierLevel } from "../types";
import { MAP_BOX_CLASSES } from "./mapBox";

// MapLibre es la dependencia más pesada del frontend después del generador
// de PDF. Cargarla con import() la saca del bundle principal, para que quien
// solo use el buscador no se descargue un motor de mapas que no va a abrir.
// Mismo patrón que el PDF en ProposalDetailView.tsx.
const DayMap = lazy(() => import("./DayMap").then((module) => ({ default: module.DayMap })));

const placeholder = (
  <div className={`flex items-center justify-center bg-ink-50 ${MAP_BOX_CLASSES}`}>
    <p className="text-sm text-ink-500">Cargando el mapa…</p>
  </div>
);

export function DayMapLazy(props: { stops: DayStop[]; tier: TierLevel }) {
  return <Suspense fallback={placeholder}>{<DayMap {...props} />}</Suspense>;
}
