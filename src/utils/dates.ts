export function nightsBetween(departureDate: string, returnDate: string): number {
  const start = new Date(departureDate);
  const end = new Date(returnDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Un rango de fechas tal como lo diría una persona.
 *
 *   mismo mes      "24 – 31 ago 2026"
 *   distinto mes   "28 nov – 3 dic 2026"
 *   distinto año   "28 dic 2026 – 3 ene 2027"
 *
 * Existe porque tres pantallas pintaban el ISO en crudo —"2026-08-24 →
 * 2026-08-31" en el encabezado de resultados— teniendo formatDate() a mano
 * desde siempre. No faltaba la herramienta: faltaba usarla.
 *
 * El año se dice una vez, y siempre: un viaje guardado puede ser de
 * cualquier año y "24 – 31 ago" a secas no permite distinguirlo.
 */
export function formatDateRange(from: string, to: string): string {
  const desde = new Date(from);
  const hasta = new Date(to);

  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    return `${from} – ${to}`;
  }

  const dia = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric" });
  const diaMes = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  if (desde.getFullYear() !== hasta.getFullYear()) {
    return `${diaMes(desde)} ${desde.getFullYear()} – ${diaMes(hasta)} ${hasta.getFullYear()}`;
  }
  if (desde.getMonth() !== hasta.getMonth()) {
    return `${diaMes(desde)} – ${diaMes(hasta)} ${hasta.getFullYear()}`;
  }
  return `${dia(desde)} – ${diaMes(hasta)} ${hasta.getFullYear()}`;
}
