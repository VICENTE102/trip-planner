import type { VercelRequest, VercelResponse } from "@vercel/node";
import { tripRequestSchema } from "../../server/schemas/trip.schema.js";

type ProposalType = "economical" | "recommended" | "comfort";

interface MockProposal {
  type: ProposalType;
  score: number;
  estimatedTotal: number;
  reasons: string[];
  warnings: string[];
}

const PROPOSAL_TYPES: ProposalType[] = ["economical", "recommended", "comfort"];

function buildMockProposals(): MockProposal[] {
  return PROPOSAL_TYPES.map((type) => ({
    type,
    score: 0,
    estimatedTotal: 0,
    reasons: [],
    warnings: [],
  }));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
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

  return res.status(201).json({
    id: requestId,
    status: "generated",
    request: {
      ...rest,
      departureDate: departureDate.toISOString().slice(0, 10),
      returnDate: returnDate.toISOString().slice(0, 10),
    },
    metadata: {
      evaluatedCombinations: 0,
      discardedCombinations: 0,
    },
    proposals: buildMockProposals(),
  });
}
