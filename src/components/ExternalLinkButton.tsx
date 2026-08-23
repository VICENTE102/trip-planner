import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { track } from "../services/analytics";

type ExternalLinkVariant = "primary" | "secondary" | "activity" | "location";

interface ExternalLinkButtonProps {
  href: string;
  label: string;
  icon?: IconName;
  variant?: ExternalLinkVariant;
  // Qué se está reservando (vuelo, hotel, actividad) y a dónde, para poder
  // saber qué genera dinero cuando lleguen los identificadores de afiliado
  // del Paso 6. Se mide desde hoy aunque los enlaces todavía no los lleven:
  // así, el día que se aprueben, ya habrá histórico con el que comparar.
  category?: string;
  destination?: string;
}

// Fixed semantic colors — these are action types, not trip-category colors,
// so they stay the same regardless of Económico/Equilibrado/Cómodo.
const VARIANT_CLASSES: Record<ExternalLinkVariant, string> = {
  primary:
    "bg-sunset-500 text-white shadow-sm hover:-translate-y-0.5 hover:bg-sunset-600 hover:shadow-md active:translate-y-0",
  secondary: "bg-lagoon-50 text-lagoon-700 hover:bg-lagoon-100",
  activity: "bg-rose-50 text-rose-700 hover:bg-rose-100",
  location: "bg-blue-50 text-blue-700 hover:bg-blue-100",
};

function providerOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "desconocido";
  }
}

export function ExternalLinkButton({
  href,
  label,
  icon = "externalLink",
  variant = "secondary",
  category,
  destination,
}: ExternalLinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("clic_afiliado", { proveedor: providerOf(href), categoria: category, destino: destination })}
      // min-h-[44px]: es el mínimo de zona pulsable que pide Apple, y este
      // enlace medía 36. De todos los de la app es el que peor lleva un
      // toque fallido: "Reservar actividad" y "Reservar hotel" son los que
      // acabarán llevando los identificadores de afiliado del Paso 6.
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${VARIANT_CLASSES[variant]}`}
    >
      <Icon name={icon} size={16} />
      {label}
    </a>
  );
}
