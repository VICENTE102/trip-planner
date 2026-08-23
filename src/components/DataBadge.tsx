import { Link } from "react-router-dom";
import type { DataConfidence } from "../types";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface DataBadgeProps {
  confidence: DataConfidence;
  /** Sustituye al texto por defecto ("Sitio real", "Estimado", "Simulado"). */
  label?: string;
  /** Enlaza a la página de fuentes, donde está la explicación larga. */
  linkToSources?: boolean;
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

const EXPLANATIONS: Record<DataConfidence, string> = {
  real: "Nombre y ubicación reales, de Overture Maps. El precio y la duración son estimaciones.",
  estimado: "Calculado por la app a partir de otros datos, no consultado a ningún proveedor.",
  simulado: "Generado por la app para orientar el presupuesto. No corresponde a una oferta real.",
};

export function DataBadge({ confidence, label, linkToSources, className = "" }: DataBadgeProps) {
  const style = STYLES[confidence];
  const content = (
    <>
      <Icon name={style.icon} size={11} className="flex-none" />
      {label ?? style.text}
    </>
  );

  const classes = `inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style.classes} ${className}`;

  if (linkToSources) {
    return (
      <Link to="/fuentes" title={EXPLANATIONS[confidence]} className={`${classes} transition hover:opacity-80`}>
        {content}
      </Link>
    );
  }

  return (
    <span title={EXPLANATIONS[confidence]} className={classes}>
      {content}
    </span>
  );
}
