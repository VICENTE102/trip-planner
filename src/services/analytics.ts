import type { PostHog } from "posthog-js";
import { getConsent, hasAccepted, onConsentChange } from "./consent";

// Capa fina sobre PostHog. Tres reglas que no se pueden romper:
//
// 1. NADA se carga ni se envía antes de que el usuario acepte. Ni el script.
//    Quien rechaza no descarga un solo byte de analítica.
// 2. track() nunca lanza. Ninguna medición puede impedir que alguien
//    descargue su PDF o guarde su viaje.
// 3. Los eventos que ocurren mientras se decide se guardan en una cola: si
//    después acepta, se envían; si rechaza, se descartan. Sin esto se
//    perdería justo el primer evento del embudo, `formulario_iniciado`,
//    que suele pasar mientras el banner sigue en pantalla.

export type AnalyticsEvent =
  | "formulario_iniciado"
  | "formulario_enviado"
  | "propuestas_generadas"
  | "propuesta_abierta"
  | "pestana_vista"
  | "clic_afiliado"
  | "viaje_guardado"
  | "pdf_descargado";

type Props = Record<string, string | number | boolean | undefined>;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = "https://eu.i.posthog.com";

// Tope de la cola: si alguien nunca decide, no tiene sentido acumular
// eventos indefinidamente en memoria.
const MAX_QUEUED = 50;

let client: PostHog | null = null;
let loading: Promise<void> | null = null;
const queue: { event: AnalyticsEvent; props?: Props }[] = [];

async function loadPostHog(): Promise<void> {
  if (client || !POSTHOG_KEY) return;
  if (loading) return loading;

  loading = (async () => {
    try {
      const { default: posthog } = await import("posthog-js");
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        // El consentimiento ya se ha comprobado antes de llegar aquí; se
        // desactiva la captura automática para que solo se envíen los
        // eventos del embudo, que son los que sabemos justificar en la
        // página de privacidad.
        autocapture: false,
        capture_pageview: false,
        // La IP no se necesita para nada de lo que medimos.
        ip: false,
      });
      client = posthog;
    } catch {
      // Bloqueador de anuncios, red caída, script no disponible. La
      // aplicación sigue funcionando exactamente igual.
      client = null;
    }
  })();

  return loading;
}

function flushQueue(): void {
  const pending = queue.splice(0, queue.length);
  if (!client) return;
  for (const item of pending) {
    try {
      client.capture(item.event, item.props);
    } catch {
      // ver regla 2
    }
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (getConsent() === "rejected") return;

  if (!hasAccepted()) {
    // Todavía decidiendo: se guarda por si acepta.
    if (queue.length < MAX_QUEUED) queue.push({ event, props });
    return;
  }

  if (!client) {
    if (queue.length < MAX_QUEUED) queue.push({ event, props });
    void loadPostHog().then(flushQueue);
    return;
  }

  try {
    client.capture(event, props);
  } catch {
    // ver regla 2
  }
}

// Se llama una vez al arrancar la aplicación. Si ya había consentimiento de
// una visita anterior, carga PostHog; si no, se queda esperando la decisión.
export function initAnalytics(): void {
  if (hasAccepted()) {
    void loadPostHog().then(flushQueue);
  }

  onConsentChange((state) => {
    if (state === "accepted") {
      void loadPostHog().then(flushQueue);
      return;
    }

    // Rechazo o revocación: se tira la cola y se apaga la captura. El
    // script ya descargado no se puede "desdescargar", pero deja de enviar.
    queue.length = 0;
    if (client) {
      try {
        client.opt_out_capturing();
      } catch {
        // ver regla 2
      }
    }
  });
}

/** Solo para pruebas: deja el módulo como recién cargado. */
export function resetAnalyticsForTests(): void {
  client = null;
  loading = null;
  queue.length = 0;
}

/** Solo para pruebas: cuántos eventos hay esperando decisión. */
export function queuedEventCountForTests(): number {
  return queue.length;
}
