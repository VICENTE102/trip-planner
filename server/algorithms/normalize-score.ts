export type NormalizationDirection = "lowerIsBetter" | "higherIsBetter";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Sección 10.3: convierte cualquier criterio a una escala común 0-100
// antes de aplicar pesos. `direction` decide si un valor más bajo (precio,
// duración, escalas...) o más alto (valoración, número de servicios...)
// es mejor.
export function normalizeScore(
  value: number,
  minValue: number,
  maxValue: number,
  direction: NormalizationDirection = "lowerIsBetter",
): number {
  if (minValue === maxValue) {
    return 100;
  }

  const ratio =
    direction === "lowerIsBetter"
      ? (maxValue - value) / (maxValue - minValue)
      : (value - minValue) / (maxValue - minValue);

  return clamp(100 * ratio, 0, 100);
}

// Firma literal de la sección 10.3 del documento, para mantener el nombre
// exacto que da como ejemplo. Reutiliza normalizeScore por debajo.
export function normalizeLowerIsBetter(value: number, minValue: number, maxValue: number): number {
  return normalizeScore(value, minValue, maxValue, "lowerIsBetter");
}
