import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getStoredTrip } from "../../server/repositories/trip.repository.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = crypto.randomUUID();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: { code: "METHOD_NOT_ALLOWED", message: "Solo se admite el método GET." },
      requestId,
    });
  }

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Falta el identificador del viaje." },
      requestId,
    });
  }

  const trip = await getStoredTrip(id);

  if (!trip) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "No se encontró ningún viaje con ese identificador." },
      requestId,
    });
  }

  return res.status(200).json({
    id: trip.id,
    status: "generated",
    request: trip.request,
    proposals: trip.proposals,
    createdAt: trip.createdAt,
  });
}
