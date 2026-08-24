// Cómo se dice "aquí no hay nada", en un solo sitio.
//
// El adaptador rellena las franjas vacías con "Mañana sin actividades
// programadas.", y tres vistas distintas necesitan reconocer esa frase para
// no darle el mismo espacio que a un plan de verdad. Con la frase escrita a
// mano en cada sitio, cambiar el texto rompería la detección en silencio: la
// interfaz volvería a pintar bloques enteros vacíos y nadie se enteraría
// hasta mirar una pantalla.

/** Lo que escribe el adaptador cuando una franja no tiene ninguna visita. */
export const EMPTY_SLOT_SUFFIX = "sin actividades programadas.";

export const EMPTY_SLOT_TEXT = {
  morning: `Mañana ${EMPTY_SLOT_SUFFIX}`,
  afternoon: `Tarde ${EMPTY_SLOT_SUFFIX}`,
  night: `Noche ${EMPTY_SLOT_SUFFIX}`,
} as const;

/**
 * Si el texto de una franja es el relleno de "no hay nada".
 *
 * Una edición del usuario cuenta como plan aunque diga poco: si se ha
 * molestado en escribirla, merece verse entera.
 */
export function isEmptySlot(text: string): boolean {
  return text.trim().endsWith(EMPTY_SLOT_SUFFIX);
}
