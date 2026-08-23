import type { DayStop, TierLevel } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { DataBadge } from "./DataBadge";
import { Icon } from "./Icon";
import { formatMinutes } from "../utils/format";

interface DayRouteProps {
  stops: DayStop[];
  tier: TierLevel;
}

// El recorrido del día con sus tiempos reales entre paradas.
//
// Existe porque el Paso 5 integró OpenRouteService para medir los paseos
// sobre el callejero de verdad —con su caché en Supabase y su tope de gasto—
// y ni un solo minuto llegaba a la pantalla: los tiempos solo movían en
// silencio la hora de inicio de cada visita. La tarjeta del día cuenta el
// plan en prosa y el mapa lo sitúa; faltaba el dato.
//
// Y distingue medido de estimado, que no es un matiz: entre el Coliseo y San
// Pedro la línea recta decía 10 minutos y la calle real dice 49.
export function DayRoute({ stops, tier }: DayRouteProps) {
  if (stops.length === 0) {
    return null;
  }

  const theme = TIER_THEME[tier];

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-ink-900">Recorrido del día</h4>

      <ol className="mt-3 flex flex-col">
        {stops.map((stop, index) => (
          <li key={stop.id}>
            {/* El desplazamiento va ENTRE dos paradas, así que se pinta antes
                de la parada a la que lleva y nunca antes de la primera. */}
            {index > 0 && stop.travelMinutes !== undefined && stop.travelMinutes > 0 && (
              <div className="flex items-center gap-2 py-1.5 pl-1 text-sm text-ink-500 sm:text-xs">
                <span className="ml-[3px] h-6 w-px flex-none bg-ink-200" />
                <Icon
                  name={stop.transportMode === "transit" ? "compass" : "footprint"}
                  size={12}
                  className="flex-none text-ink-400"
                />
                <span>
                  {formatMinutes(stop.travelMinutes)}{" "}
                  {stop.transportMode === "transit" ? "en transporte" : "andando"}
                </span>
                {stop.travelEstimated === false ? (
                  <DataBadge confidence="real" label="Ruta medida" />
                ) : (
                  <DataBadge confidence="estimado" />
                )}
              </div>
            )}

            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${theme.solidBg}`} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-900">
                  <span className="font-medium">{stop.text}</span>
                  {stop.verification && <DataBadge confidence={stop.verification} />}
                </p>
                <p className="text-sm text-ink-500 sm:text-xs">{stop.label}</p>
                {/* La web oficial del sitio, que Overture ya guarda para cada
                    lugar y no se enseñaba en ninguna parte. Es donde se
                    comprueban la tarifa y el horario, que nosotros solo
                    estimamos. */}
                {stop.website && (
                  <a
                    href={stop.website}
                    target="_blank"
                    rel="noreferrer"
                    // 16px de alto era el objetivo más pequeño de toda la app, y encima
                    // es el enlace que lleva a comprobar la tarifa real. El
                    // pseudo-elemento le da los 44px de zona pulsable sin
                    // convertirlo en un botón: sigue siendo un enlace de texto.
                    className="relative mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-lagoon-700 underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-[13px] before:content-[''] hover:underline sm:text-xs"
                  >
                    Web oficial
                    <Icon name="externalLink" size={11} className="flex-none" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
