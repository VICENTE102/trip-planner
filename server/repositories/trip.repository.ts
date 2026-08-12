import { getSupabaseClient } from "../config/supabase.js";
import type { ProviderSearchLog, TripProposal } from "../types/trip.js";

export interface StoredTrip {
  id: string;
  request: Record<string, unknown>;
  proposals: TripProposal[];
  createdAt: string;
}

// Fase 11: persistencia best-effort. Si Supabase no está configurado, o si
// falla la escritura, se registra el error en logs pero no se lanza —
// generar y devolver el viaje al usuario (ya resuelto con mocks en fases
// anteriores) nunca debe depender de que la base de datos esté disponible.
export async function persistTripGeneration(params: {
  requestId: string;
  requestSummary: Record<string, unknown>;
  proposals: TripProposal[];
  providerSearches: ProviderSearchLog[];
}): Promise<void> {
  const db = getSupabaseClient();
  if (!db) {
    console.warn(`[${params.requestId}] Supabase no configurado; se omite la persistencia.`);
    return;
  }

  const { requestId, requestSummary, proposals, providerSearches } = params;

  try {
    const { error: requestError } = await db.from("trip_requests").insert({
      id: requestId,
      origin: requestSummary.origin,
      destination: requestSummary.destination,
      departure_date: requestSummary.departureDate,
      return_date: requestSummary.returnDate,
      travelers: requestSummary.travelers,
      budget: requestSummary.budget,
      currency: requestSummary.currency,
      travel_style: requestSummary.travelStyle,
      preferences: requestSummary.preferences,
      constraints: requestSummary.constraints ?? null,
    });

    if (requestError) {
      console.error(`[${requestId}] Error guardando trip_requests`, requestError);
      return;
    }

    if (proposals.length > 0) {
      const { error: proposalsError } = await db.from("trip_proposals").insert(
        proposals.map((proposal) => ({
          trip_request_id: requestId,
          type: proposal.type,
          score: proposal.score,
          rank: proposal.rank,
          total_cost: proposal.totalCost,
          proposal,
        })),
      );
      if (proposalsError) {
        console.error(`[${requestId}] Error guardando trip_proposals`, proposalsError);
      }
    }

    if (providerSearches.length > 0) {
      const { error: searchesError } = await db.from("provider_searches").insert(
        providerSearches.map((search) => ({
          trip_request_id: requestId,
          provider: search.provider,
          offer_count: search.offerCount,
          errors: search.errors ?? null,
        })),
      );
      if (searchesError) {
        console.error(`[${requestId}] Error guardando provider_searches`, searchesError);
      }
    }
  } catch (error) {
    console.error(`[${requestId}] Error inesperado persistiendo en Supabase`, error);
  }
}

// Recupera una solicitud y sus propuestas ya guardadas (verifica que Fase 11
// no solo escribe, sino que lo escrito es legible). Devuelve undefined tanto
// si Supabase no está configurado como si no existe ese id.
export async function getStoredTrip(requestId: string): Promise<StoredTrip | undefined> {
  const db = getSupabaseClient();
  if (!db) {
    return undefined;
  }

  const { data: requestRow, error: requestError } = await db
    .from("trip_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    return undefined;
  }

  const { data: proposalRows, error: proposalsError } = await db
    .from("trip_proposals")
    .select("proposal")
    .eq("trip_request_id", requestId)
    .order("rank", { ascending: true });

  if (proposalsError) {
    return undefined;
  }

  return {
    id: requestRow.id,
    request: {
      origin: requestRow.origin,
      destination: requestRow.destination,
      departureDate: requestRow.departure_date,
      returnDate: requestRow.return_date,
      travelers: requestRow.travelers,
      budget: requestRow.budget,
      currency: requestRow.currency,
      travelStyle: requestRow.travel_style,
      preferences: requestRow.preferences,
      constraints: requestRow.constraints,
    },
    proposals: (proposalRows ?? []).map((row) => row.proposal as TripProposal),
    createdAt: requestRow.created_at,
  };
}
