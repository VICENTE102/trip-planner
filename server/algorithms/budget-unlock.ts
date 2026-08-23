import type { AccommodationOffer } from "../types/accommodation.js";
import type { ActivityCandidate } from "../types/activity.js";
import type { FlightOffer } from "../types/flight.js";
import type { PreferenceProfile } from "../types/trip.js";
import { buildScoreBreakdown, combineOffers } from "./combine-offers.js";
import { filterDominatedOptions } from "./pareto-filter.js";
import { passesQualityThresholds, validateCombination } from "./validate-trip.js";

// Cuánto presupuesto de más haría falta para que se abran alternativas
// REALES, y cuántas.
//
// Nace de un caso concreto: Madrid -> Roma, 7 noches, dos personas, 2.000 €.
// De 255 combinaciones evaluadas sobreviven 4, y las tres propuestas salen
// con el mismo hotel porque es el único que cabe. Enseñar tres cajas
// idénticas hace parecer que la app no ha entendido la búsqueda; decir "con
// 250 € más tendrías 7 alojamientos donde elegir" es ayudar de verdad.
//
// Por qué esto no puede vivir en el frontend: el coste de un viaje DEPENDE
// del presupuesto. allocateBudget() calcula la reserva de imprevistos como
// un 5% de lo que pidió el usuario, y las comidas y el transporte local como
// un porcentaje con mínimo diario. Subir el presupuesto 300 € sube también
// unos 84 € el coste de cada combinación, así que el margen que se gana no
// son 300 € sino 216. Contarlo fuera del motor obligaría a duplicar el
// reparto de presupuesto y el validador en el cliente.
//
// Lo que sí es barato: no hay ni una llamada de red. Las ofertas ya están en
// memoria de la búsqueda que se acaba de hacer; esto es aritmética sobre
// ellas.

export interface BudgetUnlock {
  /** Euros de más sobre el presupuesto actual. Ya redondeado a algo decible. */
  extraBudget: number;
  /** Alojamientos distintos disponibles con ese presupuesto. */
  unlockedOptions: number;
  /** Alojamientos distintos disponibles con el presupuesto actual. */
  currentOptions: number;
}

export interface BudgetUnlockContext {
  travelers: number;
  days: number;
  userBudget: number;
  preferences: PreferenceProfile;
}

// Escalones que se prueban, en tanto por uno sobre el presupuesto actual. Se
// para en el primero que abra opciones de verdad, para que el mensaje sea el
// salto más pequeño que sirve y no el más espectacular.
const STEPS = [0.1, 0.2, 0.35, 0.5];

// Redondeo del importe a algo que una persona diría en voz alta: 250 €, no
// 247 €. La cifra es orientativa por definición (los precios cambian), así
// que fingir precisión al euro sería falso.
function roundToNiceAmount(amount: number): number {
  if (amount <= 100) return Math.ceil(amount / 10) * 10;
  if (amount <= 500) return Math.ceil(amount / 50) * 50;
  return Math.ceil(amount / 100) * 100;
}

// Cuenta alojamientos distintos, no combinaciones. Quince vuelos contra el
// mismo hotel son quince combinaciones y una sola opción de verdad: es el
// hotel lo que cambia el viaje, y es lo que el usuario ve repetido.
//
// Recorre la MISMA cadena que la búsqueda real —validación, umbrales de
// calidad y filtro de Pareto—, no solo el presupuesto. Contar únicamente lo
// que cabe daba números que el usuario no reconocía: en la búsqueda de Roma
// decía "2 alojamientos" mientras en pantalla se veía uno, porque el segundo
// no pasaba el corte de calidad. Un número que no cuadra con lo que se ve es
// peor que no dar número.
//
// Nada de esto sale a la red: son las ofertas que ya se pidieron.
function countViableAccommodations(
  flights: FlightOffer[],
  accommodations: AccommodationOffer[],
  activities: ActivityCandidate[],
  context: BudgetUnlockContext,
  budget: number,
): number {
  const combinations = combineOffers(flights, accommodations, activities, { ...context, userBudget: budget });

  const scored = combinations.map((combination) => ({
    combination,
    scoreBreakdown: buildScoreBreakdown(combination, {
      allCombinations: combinations,
      allFlights: flights,
      allAccommodations: accommodations,
      travelers: context.travelers,
      preferences: context.preferences,
    }),
  }));

  const valid = scored.filter(
    ({ combination, scoreBreakdown }) =>
      validateCombination(combination, { userBudget: budget, travelers: context.travelers }).valid &&
      passesQualityThresholds(scoreBreakdown),
  );

  const surviving = filterDominatedOptions(valid, (option) => option.scoreBreakdown);
  return new Set(surviving.map(({ combination }) => combination.accommodation.id)).size;
}

// Devuelve null cuando no hay nada útil que decir: o ya hay variedad, o
// ningún escalón razonable la abre (subir el presupuesto un 50% y seguir con
// un solo hotel significa que el problema son las fechas o el destino, no el
// dinero — y prometer lo contrario sería mentir).
export function analyzeBudgetUnlock(
  flights: FlightOffer[],
  accommodations: AccommodationOffer[],
  activities: ActivityCandidate[],
  context: BudgetUnlockContext,
): BudgetUnlock | null {
  const currentOptions = countViableAccommodations(
    flights,
    accommodations,
    activities,
    context,
    context.userBudget,
  );

  for (const step of STEPS) {
    const extraBudget = roundToNiceAmount(context.userBudget * step);
    const unlockedOptions = countViableAccommodations(
      flights,
      accommodations,
      activities,
      context,
      context.userBudget + extraBudget,
    );

    if (unlockedOptions > currentOptions) {
      return { extraBudget, unlockedOptions, currentOptions };
    }
  }

  return null;
}
