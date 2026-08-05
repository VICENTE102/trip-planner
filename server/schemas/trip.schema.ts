import { z } from "zod";

const preferenceLevelSchema = z
  .number({ message: "El nivel de preferencia debe ser un número." })
  .int("El nivel de preferencia debe ser un número entero.")
  .min(0, "El nivel de preferencia mínimo es 0.")
  .max(3, "El nivel de preferencia máximo es 3.");

const constraintsSchema = z.object({
  reducedMobility: z.boolean().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  earliestStartTime: z.string().optional(),
  latestEndTime: z.string().optional(),
  maxWalkingMinutes: z
    .number({ message: "Los minutos máximos a pie deben ser un número." })
    .int()
    .positive("Los minutos máximos a pie deben ser un número positivo.")
    .optional(),
  checkedBaggageRequired: z.boolean().optional(),
});

export const tripRequestSchema = z
  .object({
    origin: z
      .string({ message: "Indica una ciudad o aeropuerto de origen." })
      .trim()
      .min(2, "El origen debe tener al menos 2 caracteres.")
      .max(100, "El origen no puede superar los 100 caracteres."),
    destination: z
      .string({ message: "Indica un destino." })
      .trim()
      .min(2, "El destino debe tener al menos 2 caracteres.")
      .max(100, "El destino no puede superar los 100 caracteres."),
    departureDate: z.coerce.date({ message: "Indica una fecha de salida válida." }),
    returnDate: z.coerce.date({ message: "Indica una fecha de regreso válida." }),
    travelers: z.object(
      {
        adults: z
          .number({ message: "Indica el número de adultos." })
          .int("El número de adultos debe ser un número entero.")
          .min(1, "Debe viajar al menos 1 adulto.")
          .max(9, "El número de adultos no puede superar 9."),
        children: z
          .number({ message: "Indica el número de menores." })
          .int("El número de menores debe ser un número entero.")
          .min(0, "El número de menores no puede ser negativo.")
          .max(9, "El número de menores no puede superar 9."),
      },
      { message: "Indica los viajeros (adultos y menores)." },
    ),
    budget: z
      .number({ message: "Indica un presupuesto." })
      .positive("El presupuesto debe ser mayor que 0.")
      .max(100000, "El presupuesto no puede superar 100.000."),
    currency: z.enum(["EUR", "USD", "GBP"], {
      message: "Moneda no admitida. Usa EUR, USD o GBP.",
    }),
    travelStyle: z.enum(["economical", "balanced", "comfort"], {
      message: "Estilo de viaje no admitido. Usa economical, balanced o comfort.",
    }),
    preferences: z.object(
      {
        beach: preferenceLevelSchema,
        culture: preferenceLevelSchema,
        gastronomy: preferenceLevelSchema,
        nightlife: preferenceLevelSchema,
        nature: preferenceLevelSchema,
        shopping: preferenceLevelSchema,
        family: preferenceLevelSchema,
        relax: preferenceLevelSchema,
      },
      { message: "Indica el nivel de cada preferencia (0-3)." },
    ),
    constraints: constraintsSchema.optional(),
  })
  .refine((data) => data.returnDate > data.departureDate, {
    path: ["returnDate"],
    message: "La fecha de regreso debe ser posterior a la fecha de salida.",
  });

export type ValidatedTripRequest = z.infer<typeof tripRequestSchema>;
