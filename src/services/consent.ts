// Consentimiento de cookies analíticas.
//
// AVISO: esto NO es asesoramiento legal. Está implementado por el camino
// conservador (nada se carga ni se mide hasta que el usuario acepta), pero
// está pendiente de que lo revise un profesional. Ver CLAUDE.md.

const STORAGE_KEY = "cookie-consent";

export type ConsentChoice = "accepted" | "rejected";

// undefined = todavía no ha decidido, que es distinto de haber rechazado:
// sin decisión hay que enseñar el banner, con rechazo no.
export type ConsentState = ConsentChoice | undefined;

// localStorage puede lanzar: modo privado de Safari, almacenamiento
// deshabilitado, cuota llena. Nada de eso puede romper la aplicación, y
// ante la duda se trata como "no ha consentido".
function safeRead(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Sin poder recordar la decisión, el banner volverá a aparecer en la
    // siguiente visita. Es molesto, pero es el lado seguro: nunca se
    // asume un consentimiento que no se puede demostrar.
  }
}

export function getConsent(): ConsentState {
  const stored = safeRead();
  return stored === "accepted" || stored === "rejected" ? stored : undefined;
}

export function hasAccepted(): boolean {
  return getConsent() === "accepted";
}

export function setConsent(choice: ConsentChoice): void {
  safeWrite(choice);
  notify(choice);
}

// Permite cambiar de opinión desde el pie de página, como exige poder
// hacerse con la misma facilidad con la que se aceptó.
export function clearConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ver safeWrite
  }
  notify(undefined);
}

type Listener = (state: ConsentState) => void;
const listeners = new Set<Listener>();

function notify(state: ConsentState): void {
  for (const listener of listeners) {
    listener(state);
  }
}

// Suscripción para que el banner y la capa de analítica reaccionen a la
// decisión sin tener que recargar la página.
export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
