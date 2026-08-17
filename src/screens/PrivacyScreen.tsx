import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { clearConsent, getConsent, onConsentChange, setConsent, type ConsentState } from "../services/consent";

const ESTADO: Record<string, string> = {
  accepted: "Has aceptado las cookies analíticas.",
  rejected: "Has rechazado las cookies analíticas. No se está midiendo nada.",
};

// Qué se mide exactamente. Se enumera evento por evento a propósito: decir
// "usamos analítica para mejorar el servicio" no informa de nada, y el
// consentimiento tiene que ser informado.
const EVENTOS: { nombre: string; que: string }[] = [
  { nombre: "Empiezas a rellenar el formulario", que: "Para saber cuánta gente lo abandona a medias." },
  { nombre: "Buscas un viaje", que: "El destino, la duración y el presupuesto. Nunca tu nombre ni tu correo." },
  { nombre: "Se generan propuestas", que: "Cuántas salen, o si no sale ninguna porque el presupuesto no llega." },
  { nombre: "Abres una propuesta", que: "Cuál de las tres: económica, equilibrada o cómoda." },
  { nombre: "Cambias de pestaña", que: "Si miras el itinerario, el alojamiento, los vuelos o los gastos." },
  { nombre: "Pulsas un enlace de reserva", que: "A qué proveedor vas y desde qué parte del viaje." },
  { nombre: "Guardas un viaje o descargas el PDF", que: "Para saber qué propuestas convencen de verdad." },
];

export function PrivacyScreen() {
  const [estado, setEstado] = useState<ConsentState>(undefined);

  useEffect(() => {
    setEstado(getConsent());
    return onConsentChange(setEstado);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:py-16">
      <h1 className="flex items-center gap-2 font-heading text-3xl font-bold text-ink-900 lg:text-4xl">
        <Icon name="compass" size={28} className="text-sunset-500" />
        Privacidad y cookies
      </h1>
      <p className="mt-3 text-ink-700">
        Esta página cuenta exactamente qué se mide y te deja cambiar de opinión en cualquier momento.
      </p>

      <section className="mt-8 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="font-heading text-xl font-bold text-ink-900">Tu decisión</h2>
        <p className="mt-2 text-sm text-ink-700">
          {estado ? ESTADO[estado] : "Todavía no has decidido, así que no se está midiendo nada."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConsent("rejected")}
            className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => setConsent("accepted")}
            className="rounded-full border border-ink-900 bg-ink-900 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Aceptar
          </button>
          {estado && (
            <button
              type="button"
              onClick={clearConsent}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-ink-500 underline-offset-2 transition hover:underline"
            >
              Volver a preguntarme
            </button>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-bold text-ink-900">Qué se mide</h2>
        <p className="mt-2 text-ink-700">
          Solo si aceptas. Nada de esto se carga ni se envía antes de que lo hagas.
        </p>
        <dl className="mt-4 flex flex-col gap-3">
          {EVENTOS.map((evento) => (
            <div key={evento.nombre} className="rounded-2xl border border-ink-200 bg-white p-4">
              <dt className="font-semibold text-ink-900">{evento.nombre}</dt>
              <dd className="mt-1 text-sm text-ink-700">{evento.que}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-bold text-ink-900">Quién lo trata</h2>
        <p className="mt-2 text-ink-700">
          <a
            href="https://posthog.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-ink-900 underline underline-offset-2"
          >
            PostHog
          </a>
          , con los datos alojados en la Unión Europea. No enviamos tu dirección IP y no usamos publicidad ni
          seguimiento entre webs. Los viajes que guardas se quedan en tu propio navegador, no en un servidor
          nuestro.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-bold text-ink-900">Qué NO se mide</h2>
        <p className="mt-2 text-ink-700">
          No pedimos ni guardamos nombre, correo, teléfono ni datos de pago, porque TripPlanner no tiene cuentas
          de usuario ni cobra nada. Las reservas se hacen en la web del proveedor, no aquí.
        </p>
      </section>
    </div>
  );
}
