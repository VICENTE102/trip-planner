import type { Preference, SearchParams } from "../types";

type TravelPreference =
  | "beach"
  | "culture"
  | "gastronomy"
  | "nightlife"
  | "nature"
  | "shopping"
  | "family"
  | "relax";

type PreferenceLevel = 0 | 1 | 2 | 3;

interface TripRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: { adults: number; children: number };
  budget: number;
  currency: "EUR" | "USD" | "GBP";
  travelStyle: "economical" | "balanced" | "comfort";
  preferences: Record<TravelPreference, PreferenceLevel>;
}

type ProposalType = "economical" | "recommended" | "comfort";

interface ScoreBreakdown {
  price: number;
  accommodationQuality: number;
  location: number;
  transportComfort: number;
  usableTime: number;
  preferenceMatch: number;
}

interface BudgetBreakdown {
  mainTransportCost: number;
  accommodationCost: number;
  foodBudget: number;
  activityCost: number;
  localTransportCost: number;
  insuranceCost: number;
  emergencyReserve: number;
  totalTripCost: number;
}

// flight/accommodation/itinerary se dejan sin tipar en detalle: el
// frontend todavía no renderiza estos datos (siguen viniendo de
// searchService.ts, ver Fase 4), solo los guarda en sessionStorage. Se
// tipará en profundidad cuando /results empiece a consumirlos de verdad.
export interface TripProposal {
  type: ProposalType;
  score: number;
  rank: number;
  scoreBreakdown: ScoreBreakdown;
  flight: Record<string, unknown>;
  accommodation: Record<string, unknown>;
  itinerary: unknown[];
  budget: BudgetBreakdown;
  totalCost: number;
  costPerPerson: number;
  evaluatedCombinations: number;
  discardedCombinations: number;
  reasons: string[];
  warnings: string[];
}

export interface GenerateTripResponse {
  id: string;
  status: string;
  request: Record<string, unknown>;
  metadata: { evaluatedCombinations: number; discardedCombinations: number };
  proposals: TripProposal[];
}

interface TripApiErrorIssue {
  path: string;
  message: string;
}

interface TripApiErrorPayload {
  error: { code: string; message: string; issues?: TripApiErrorIssue[] };
  requestId: string;
}

export class TripApiError extends Error {
  code: string;
  issues?: TripApiErrorIssue[];
  requestId: string;

  constructor(payload: TripApiErrorPayload) {
    super(payload.error.message);
    this.name = "TripApiError";
    this.code = payload.error.code;
    this.issues = payload.error.issues;
    this.requestId = payload.requestId;
  }
}

// Mapea las etiquetas en español de la interfaz a las claves en inglés del
// contrato TripRequest.
const PREFERENCE_KEY_MAP: Record<Preference, TravelPreference> = {
  Playa: "beach",
  Cultura: "culture",
  Gastronomía: "gastronomy",
  "Vida nocturna": "nightlife",
  Naturaleza: "nature",
  Compras: "shopping",
  Familia: "family",
  Relax: "relax",
};

const CATEGORY_TO_TRAVEL_STYLE: Record<SearchParams["category"], TripRequest["travelStyle"]> = {
  economico: "economical",
  equilibrado: "balanced",
  comodo: "comfort",
};

// La interfaz actual solo permite seleccionar/deseleccionar una preferencia
// (sin niveles de intensidad). Hasta que la Fase 9 introduzca un selector
// 0-3 real, toda preferencia seleccionada se traduce como nivel 2
// ("importante") y toda no seleccionada como nivel 0 ("no interesa").
const SELECTED_PREFERENCE_LEVEL: PreferenceLevel = 2;
const UNSELECTED_PREFERENCE_LEVEL: PreferenceLevel = 0;

function mapPreferences(selected: Preference[]): Record<TravelPreference, PreferenceLevel> {
  const preferences = {} as Record<TravelPreference, PreferenceLevel>;
  for (const key of Object.values(PREFERENCE_KEY_MAP)) {
    preferences[key] = UNSELECTED_PREFERENCE_LEVEL;
  }
  for (const preference of selected) {
    preferences[PREFERENCE_KEY_MAP[preference]] = SELECTED_PREFERENCE_LEVEL;
  }
  return preferences;
}

export function mapSearchParamsToTripRequest(params: SearchParams): TripRequest {
  return {
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
    travelers: { adults: params.travelers, children: params.children },
    budget: params.budget,
    currency: "EUR",
    travelStyle: CATEGORY_TO_TRAVEL_STYLE[params.category],
    preferences: mapPreferences(params.preferences),
  };
}

export function formatTripApiError(error: unknown): string {
  if (error instanceof TripApiError) {
    if (error.issues && error.issues.length > 0) {
      return error.issues.map((issue) => issue.message).join(" ");
    }
    return error.message;
  }
  return "No se pudo generar el viaje. Inténtalo de nuevo.";
}

export async function generateTrip(params: SearchParams): Promise<GenerateTripResponse> {
  let response: Response;
  try {
    response = await fetch("/api/trips/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapSearchParamsToTripRequest(params)),
    });
  } catch {
    throw new TripApiError({
      error: {
        code: "NETWORK_ERROR",
        message: "No se pudo conectar con el servidor. Comprueba tu conexión.",
      },
      requestId: "",
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TripApiError({
      error: {
        code: "INVALID_RESPONSE",
        message: `El servidor respondió de forma inesperada (${response.status}).`,
      },
      requestId: "",
    });
  }

  if (!response.ok) {
    throw new TripApiError(payload as TripApiErrorPayload);
  }

  return payload as GenerateTripResponse;
}
