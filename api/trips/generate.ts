import type { VercelRequest, VercelResponse } from "@vercel/node";
import { tripRequestSchema } from "../../server/schemas/trip.schema.js";
import { generateTripProposals } from "../../server/services/trip-planner.service.js";
import { persistTripGeneration } from "../../server/repositories/trip.repository.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: { code: "METHOD_NOT_ALLOWED", message: "Solo se admite el método POST." },
      requestId,
    });
  }

  const parsed = tripRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "La solicitud de viaje no es válida.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      requestId,
    });
  }

  const { departureDate, returnDate, ...rest } = parsed.data;
  const requestSummary = {
    ...rest,
    departureDate: departureDate.toISOString().slice(0, 10),
    returnDate: returnDate.toISOString().slice(0, 10),
  };

  try {
    const { proposals, evaluatedCombinations, discardedCombinations, providerSearches } =
      await generateTripProposals(parsed.data);

    await persistTripGeneration({
      requestId,
      requestSummary,
      proposals,
      providerSearches,
    });

    return res.status(201).json({
      id: requestId,
      status: "generated",
      request: requestSummary,
      metadata: { evaluatedCombinations, discardedCombinations },
      proposals,
    });
  } catch (error) {
    // Sección 16.3: mensaje seguro al usuario, detalle técnico solo en logs.
    console.error(`[${requestId}] Error generando propuestas de viaje`, error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "No se pudo generar el viaje. Inténtalo de nuevo." },
      requestId,
    });
  }
}
