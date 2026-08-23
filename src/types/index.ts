export type TierLevel = "barato" | "medio" | "caro";

export type TripCategory = "economico" | "equilibrado" | "comodo";

export const PREFERENCES = [
  "Playa",
  "Cultura",
  "Gastronomía",
  "Vida nocturna",
  "Naturaleza",
  "Compras",
  "Familia",
  "Relax",
] as const;

export type Preference = (typeof PREFERENCES)[number];

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string; // ISO date (YYYY-MM-DD)
  returnDate: string; // ISO date (YYYY-MM-DD)
  budget: number;
  travelers: number;
  children: number;
  category: TripCategory;
  preferences: Preference[];
}

export interface Hotel {
  id: string;
  name: string;
  tier: TierLevel;
  pricePerNight: number;
  totalPrice: number;
  rating: number; // 0-5
  stars: number; // 1-5
  amenities: string[];
  imageUrl?: string;
}

export interface Flight {
  id: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  // Opcional porque el backend cotiza el vuelo como una única oferta de ida
  // y vuelta (FlightOffer.totalPrice), no un precio por trayecto: en ese
  // caso el importe vive en Itinerary.flightsTotalPrice y aquí queda sin
  // definir, en vez de repetir el total en cada trayecto y aparentar el
  // doble de lo que cuesta.
  price?: number;
}

export interface Restaurant {
  name: string;
  description: string;
  area: string;
  tier: TierLevel;
}

export interface DayStop {
  id: string;
  label: string;
  text: string;
  lat: number;
  lng: number;
}

// Capa de ediciones del usuario sobre un día generado. Nunca sobrescribe los
// campos originales (morning/afternoon/night/restaurant en ItineraryDay) —
// se guarda aparte para poder "restaurar" un bloque sin perder lo que generó
// el motor. Un campo ausente aquí significa "sin editar, usar el original".
export interface DayEdits {
  morning?: string;
  afternoon?: string;
  night?: string;
  restaurant?: Partial<Omit<Restaurant, "tier">>;
}

// Comida real programada por el motor del backend: sabe la hora y el coste
// estimado, pero no el sitio (no hay proveedor de restaurantes todavía).
// Se muestra tal cual en vez de inventar un restaurante con nombre y zona.
export interface DayMeal {
  id: string;
  title: string; // "Comida" | "Cena"
  time: string; // "14:00"
  costPerPerson?: number;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string; // ISO date
  isArrivalDay: boolean;
  morning: string;
  morningActivityId: string;
  // Un día trae `restaurant` (generador antiguo del cliente, que inventa el
  // local) o `meals` (motor del backend, que solo sabe hora y coste), nunca
  // los dos. Ambos son opcionales para que ninguna vista dé por hecho que
  // hay un restaurante con nombre que enseñar.
  restaurant?: Restaurant;
  meals?: DayMeal[];
  afternoon: string;
  afternoonActivityId: string;
  night: string;
  // Coordenadas ficticias y deterministas (ver src/utils/geo.ts) para pintar
  // el mapa de "Día a día" mientras no hay coordenadas reales.
  stops: DayStop[];
  edits?: DayEdits;
}

export interface Itinerary {
  totalDays: number;
  totalNights: number;
  outboundFlight?: Flight;
  returnFlight?: Flight;
  // Precio de ida y vuelta para todos los viajeros, cuando el proveedor
  // cotiza el vuelo entero de una vez (ver Flight.price).
  flightsTotalPrice?: number;
  days: ItineraryDay[];
}

export interface EconomicSummary {
  accommodation: number;
  meals: number;
  transport: number; // transporte local en destino
  activities: number;
  // Partidas que solo calcula el motor del backend (BudgetBreakdown). Son
  // opcionales porque el generador antiguo del cliente no las reparte: si
  // faltan, la vista de gastos simplemente no pinta esas filas.
  mainTransport?: number; // vuelos
  insurance?: number;
  emergencyReserve?: number;
  total: number;
  budgetReference: number;
  remaining: number;
}

export interface TripProposal {
  tier: TierLevel;
  hotel: Hotel;
  itinerary: Itinerary;
  economicSummary: EconomicSummary;
  // Frases ya redactadas por el motor a partir de sus propios números
  // ("El alojamiento se encuentra a 1,9 km del centro"). Son lo que explica
  // POR QUÉ esta propuesta cuesta lo que cuesta, y lo que convierte tres
  // filas parecidas en tres opciones con argumento.
  //
  // `distinguishing` son las que NO se repiten en las otras propuestas: una
  // razón idéntica en las tres no compara nada y solo diluye a las que sí.
  reasons: string[];
  distinguishingReasons: string[];
  // Avisos propios de esta propuesta (sin equipaje, con escala, sin
  // cancelación gratuita). El descargo general de datos simulados NO está
  // aquí: viaja una sola vez en SearchResult.disclaimer.
  warnings: string[];
}

export interface SearchResult {
  searchParams: SearchParams;
  /** Aviso global del producto, válido para todas las propuestas. */
  disclaimer?: string;
  proposals: TripProposal[];
}

export interface Trip {
  id: string;
  createdAt: string; // ISO datetime
  searchParams: SearchParams;
  proposal: TripProposal;
}
