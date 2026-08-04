import type { SearchParams } from "../types";

export type SearchFormErrors = Partial<Record<keyof SearchParams, string>>;

export function validateSearchParams(params: SearchParams): SearchFormErrors {
  const errors: SearchFormErrors = {};

  if (!params.origin.trim()) {
    errors.origin = "Indica una ciudad de salida";
  }

  if (!params.destination.trim()) {
    errors.destination = "Indica un destino";
  }

  if (!params.departureDate) {
    errors.departureDate = "Indica una fecha de salida";
  }

  if (!params.returnDate) {
    errors.returnDate = "Indica una fecha de vuelta";
  }

  if (params.departureDate && params.returnDate) {
    if (params.returnDate <= params.departureDate) {
      errors.returnDate = "Debe ser posterior a la fecha de salida";
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  if (params.departureDate && params.departureDate < today) {
    errors.departureDate = "No puede ser una fecha pasada";
  }

  if (!params.budget || params.budget <= 0) {
    errors.budget = "Indica un presupuesto mayor que 0";
  }

  if (!params.travelers || params.travelers < 1) {
    errors.travelers = "Debe haber al menos 1 viajero";
  }

  return errors;
}
