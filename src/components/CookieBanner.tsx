import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, onConsentChange, setConsent } from "../services/consent";

// Banner de consentimiento.
//
// Los dos botones tienen el MISMO peso visual a propósito: mismo tamaño,
// misma tipografía, misma prominencia. Rechazar tiene que costar lo mismo
// que aceptar, y no hay casillas premarcadas ni "seguir navegando implica
// aceptar". Es el camino conservador; ver el aviso de CLAUDE.md sobre la
// revisión legal pendiente.
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === undefined);
    return onConsentChange((state) => setVisible(state === undefined));
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white/95 shadow-lg backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p className="text-sm text-ink-700">
          Usamos cookies propias para entender cómo se usa TripPlanner y mejorarlo. No se cargan hasta que lo
          aceptes, y puedes cambiar de opinión cuando quieras.{" "}
          <Link to="/privacidad" className="font-semibold text-ink-900 underline underline-offset-2">
            Más información
          </Link>
        </p>

        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => setConsent("rejected")}
            className="flex-1 rounded-full border border-ink-300 px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 sm:flex-none"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => setConsent("accepted")}
            className="flex-1 rounded-full border border-ink-900 bg-ink-900 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 sm:flex-none"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
