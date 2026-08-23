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

// De dónde sale un dato, en el único vocabulario que la interfaz necesita:
//
//   real      el sitio existe y está donde dice (Overture Maps), o el tiempo
//             se ha medido sobre el callejero (OpenRouteService)
//   estimado  calculado a partir de otra cosa, no consultado a nadie
//   simulado  generado por la app; no corresponde a nada que exista
//
// Lo que hace falta para que un usuario distinga el Museo Nazionale Etrusco,
// que existe, del "Hotel Roma Jardín", que no.
export type DataConfidence = "real" | "estimado" | "simulado";

export interface Hotel {
  id: string;
  name: string;
  tier: TierLevel;
  pricePerNight: number;
  totalPrice: number;
  rating: number; // 0-5
  amenities: string[];
  imageUrl?: string;
  // Datos que el motor ya calculaba y la ficha no enseñaba. Opcionales
  // porque el generador antiguo del cliente no los tiene.
  distanceToCenterKm?: number;
  freeCancellation?: boolean;
  breakfastIncluded?: boolean;
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
  /** "real" para los sitios de Overture; "simulado" para los inventados. */
  verification?: DataConfidence;
  /** Web oficial del sitio, cuando Overture la tiene. */
  website?: string;
  // Minutos desde la parada anterior, y si son una ruta medida o una
  // estimación. Los calculaba el motor desde el Paso 5 y no se enseñaban en
  // ninguna parte: solo movían la hora de inicio de cada visita.
  travelMinutes?: number;
  transportMode?: "walk" | "transit";
  travelEstimated?: boolean;
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
  stops: DayStop[];
  // Procedencia de los sitios de ESTE día, para poder marcarlo de un vistazo.
  // "real" solo si todas sus visitas vienen de un proveedor real: basta una
  // inventada para que la etiqueta deje de ser cierta.
  placesVerification?: DataConfidence;
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

// Qué haría falta para tener alternativas de verdad. Llega del motor porque
// el coste de un viaje depende del presupuesto (allocateBudget reparte tres
// partidas como porcentaje de lo que pidió el usuario), así que "cuántas
// opciones se abrirían con 300 € más" no se puede calcular aquí sin duplicar
// el reparto y el validador.
export interface BudgetUnlock {
  extraBudget: number;
  unlockedOptions: number;
  currentOptions: number;
}

export interface SearchResult {
  searchParams: SearchParams;
  /** Aviso global del producto, válido para todas las propuestas. */
  disclaimer?: string;
  budgetUnlock?: BudgetUnlock | null;
  proposals: TripProposal[];
}

export interface Trip {
  id: string;
  createdAt: string; // ISO datetime
  searchParams: SearchParams;
  proposal: TripProposal;
}
