import type { FlightOffer } from "../types/flight.js";
import { normalizeScore } from "./normalize-score.js";

export interface FlightScoreBreakdown {
  price: number;
  duration: number;
  stops: number;
  schedule: number;
  baggageAndConditions: number;
}

export interface FlightScoreResult {
  score: number;
  breakdown: FlightScoreBreakdown;
}

// Sección 11.2.
const FLIGHT_SCORE_WEIGHTS = {
  price: 0.4,
  duration: 0.2,
  stops: 0.15,
  schedule: 0.15,
  baggageAndConditions: 0.1,
};

// El documento no da una fórmula para "horarios": se define aquí como
// cercanía de la salida de ida a una franja cómoda (08:00-20:00). Salidas
// de madrugada o de noche penalizan, en minutos de distancia a esa franja.
const COMFORTABLE_WINDOW_START_MINUTES = 8 * 60;
const COMFORTABLE_WINDOW_END_MINUTES = 20 * 60;

function minutesFromMidnightUtc(isoDateTime: string): number {
  const date = new Date(isoDateTime);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function scheduleDiscomfort(flight: FlightOffer): number {
  const departureMinutes = minutesFromMidnightUtc(flight.outbound[0].departureTime);
  if (departureMinutes < COMFORTABLE_WINDOW_START_MINUTES) {
    return COMFORTABLE_WINDOW_START_MINUTES - departureMinutes;
  }
  if (departureMinutes > COMFORTABLE_WINDOW_END_MINUTES) {
    return departureMinutes - COMFORTABLE_WINDOW_END_MINUTES;
  }
  return 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scoreFlight(flight: FlightOffer, candidates: FlightOffer[]): FlightScoreResult {
  const prices = candidates.map((f) => f.totalPrice);
  const durations = candidates.map((f) => f.totalDurationMinutes);
  const stopCounts = candidates.map((f) => f.stops);
  const discomforts = candidates.map((f) => scheduleDiscomfort(f));

  const price = normalizeScore(flight.totalPrice, Math.min(...prices), Math.max(...prices), "lowerIsBetter");
  const duration = normalizeScore(
    flight.totalDurationMinutes,
    Math.min(...durations),
    Math.max(...durations),
    "lowerIsBetter",
  );
  const stops = normalizeScore(flight.stops, Math.min(...stopCounts), Math.max(...stopCounts), "lowerIsBetter");
  const schedule = normalizeScore(
    scheduleDiscomfort(flight),
    Math.min(...discomforts),
    Math.max(...discomforts),
    "lowerIsBetter",
  );
  // Equipaje y condiciones no dependen del resto de candidatos: cada
  // condición aporta una parte fija de los 100 puntos posibles.
  const baggageAndConditions = (flight.baggageIncluded ? 70 : 0) + (flight.refundable ? 30 : 0);

  const breakdown: FlightScoreBreakdown = { price, duration, stops, schedule, baggageAndConditions };

  const score = round2(
    breakdown.price * FLIGHT_SCORE_WEIGHTS.price +
      breakdown.duration * FLIGHT_SCORE_WEIGHTS.duration +
      breakdown.stops * FLIGHT_SCORE_WEIGHTS.stops +
      breakdown.schedule * FLIGHT_SCORE_WEIGHTS.schedule +
      breakdown.baggageAndConditions * FLIGHT_SCORE_WEIGHTS.baggageAndConditions,
  );

  return { score, breakdown };
}
