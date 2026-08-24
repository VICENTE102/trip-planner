import { Link } from "react-router-dom";
import { Icon } from "./Icon";

// Lo que la aplicación NO hace todavía, dicho una vez por itinerario.
//
// Antes vivía dentro de cada comida —"Aún sin restaurante asignado."— y con
// dos comidas por día salía diez veces en una sola pantalla, empujando el
// dato útil (el presupuesto de la comida) detrás de una disculpa repetida.
//
// Una advertencia que se repite diez veces no se lee diez veces: se deja de
// leer. Dicha una vez, y donde corresponde, sí se lee.
export function ItineraryNote() {
  return (
    <p className="mb-3 flex items-start gap-1.5 px-1 text-sm text-ink-500 sm:text-xs">
      <Icon name="utensils" size={13} className="mt-0.5 flex-none text-ink-400" />
      <span>
        Las comidas llevan hora y presupuesto estimado, pero todavía no proponemos restaurantes concretos.{" "}
        <Link to="/fuentes" className="font-semibold underline-offset-2 hover:underline">
          Qué es real y qué es una estimación
        </Link>
      </span>
    </p>
  );
}
