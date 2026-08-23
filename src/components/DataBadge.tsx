import { Link } from "react-router-dom";
import type { DataConfidence } from "../types";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface DataBadgeProps {
  confidence: DataConfidence;
  /** Sustituye al texto por defecto ("Sitio real", "Estimado", "Simulado"). */
  label?: string;
  className?: string;
}

// Marca de procedencia, pegada al dato que califica.
//
// Nace de un desequilibrio incómodo: lo mejor que tiene la app es lo único
// que no presumía, y lo peor se presentaba con la misma seguridad. Un usuario
// leía "Suites Roma Jardín · 3,8/5 · 1.529 €" sin manera de saber que ese
// hotel no existe, mientras el Museo Nazionale Etrusco sí existe y está a
// doce minutos andando de verdad.
//
// Un aviso general al pie no arregla eso: se lee una vez y se olvida, y
// además reparte la misma sospecha sobre todo. La marca va aquí, junto a cada
// dato, y dice cuál de las tres cosas es.
const STYLES: Record<DataConfidence, { icon: IconName; text: string; classes: string }> = {
  real: {
    icon: "check",
    text: "Sitio real",
    classes: "bg-lagoon-50 text-lagoon-700 ring-lagoon-600/20",
  },
  estimado: {
    icon: "compass",
    text: "Estimado",
    classes: "bg-ink-100 text-ink-600 ring-ink-500/20",
  },
  simulado: {
    icon: "alert",
    text: "Simulado",
    classes: "bg-sunset-50 text-sunset-700 ring-sunset-600/20",
  },
};

// Qué significa cada marca, para quien llegue a /fuentes desde ella.
const ANCHORS: Record<DataConfidence, string> = {
  real: "#real",
  estimado: "#estimado",
  simulado: "#simulado",
};

const DESCRIPTIONS: Record<DataConfidence, string> = {
  real: "Sitio real: nombre y ubicación verificados. Ver fuentes de datos.",
  estimado: "Dato estimado por la aplicación. Ver fuentes de datos.",
  simulado: "Dato simulado, no es una oferta real. Ver fuentes de datos.",
};

export function DataBadge({ confidence, label, className = "" }: DataBadgeProps) {
  const style = STYLES[confidence];

  // Esto era un `title`, y en un móvil un `title` no existe: no hay puntero
  // que pueda posarse encima. La explicación que escribimos para ser honestos
  // con el dato resultaba invisible justo para la mayoría de la gente. Ahora
  // la marca es un enlace a /fuentes, donde esa explicación ya vivía escrita
  // y con más espacio del que cabe en un globo.
  //
  // El pseudo-elemento agranda la zona pulsable de 21 a 45 px sin agrandar la
  // marca: ocupa espacio de puntero, no de maquetación. Es la respuesta a que
  // un objetivo de 21 px es imposible de acertar con el dedo, sin caer en
  // inflar visualmente una etiqueta que debe ser discreta.
  return (
    <Link
      to={`/fuentes${ANCHORS[confidence]}`}
      aria-label={DESCRIPTIONS[confidence]}
      className={`relative inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold sm:text-[11px] ring-1 ring-inset transition before:absolute before:-inset-x-1 before:-inset-y-[13px] before:content-[''] hover:opacity-80 ${style.classes} ${className}`}
    >
      <Icon name={style.icon} size={11} className="flex-none" />
      {label ?? style.text}
    </Link>
  );
}
