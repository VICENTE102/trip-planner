import { useState } from "react";
import type { FormEvent } from "react";
import type { SearchParams, TierLevel, TripCategory } from "../types";
import { validateSearchParams } from "../utils/validation";
import type { SearchFormErrors } from "../utils/validation";
import { PreferenceChips } from "./PreferenceChips";
import { Icon } from "./Icon";
import { TIER_THEME } from "../constants/tierTheme";

interface SearchFormProps {
  onSubmit: (params: SearchParams) => void;
}

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const initialParams: SearchParams = {
  origin: "",
  destination: "",
  departureDate: tomorrow,
  returnDate: nextWeek,
  budget: 500,
  budgetType: "total",
  travelers: 1,
  category: "sorprendeme",
  preferences: [],
};

const CATEGORY_TIER: Partial<Record<TripCategory, TierLevel>> = {
  economico: "barato",
  equilibrado: "medio",
  comodo: "caro",
};

const CATEGORY_OPTIONS: { value: TripCategory; label: string }[] = [
  { value: "economico", label: "Económico" },
  { value: "equilibrado", label: "Equilibrado" },
  { value: "comodo", label: "Cómodo" },
  { value: "sorprendeme", label: "Sorpréndeme" },
];

const inputClass =
  "rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-base text-ink-900 placeholder:text-ink-500/60 transition focus:border-lagoon-500 focus:outline-none focus:ring-2 focus:ring-lagoon-100";
const labelClass = "text-sm font-semibold text-ink-700";
const errorClass = "text-sm text-sunset-700";

export function SearchForm({ onSubmit }: SearchFormProps) {
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [errors, setErrors] = useState<SearchFormErrors>({});

  function updateField<K extends keyof SearchParams>(field: K, value: SearchParams[K]) {
    setParams((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateSearchParams(params);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(params);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="origin" className={labelClass}>
            ¿Desde dónde sales?
          </label>
          <input
            id="origin"
            type="text"
            placeholder="Ej. Madrid"
            value={params.origin}
            onChange={(e) => updateField("origin", e.target.value)}
            className={inputClass}
          />
          {errors.origin && <span className={errorClass}>{errors.origin}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="destination" className={labelClass}>
            ¿A dónde te apetece ir?
          </label>
          <input
            id="destination"
            type="text"
            placeholder="Ej. Lisboa"
            value={params.destination}
            onChange={(e) => updateField("destination", e.target.value)}
            className={inputClass}
          />
          {errors.destination && <span className={errorClass}>{errors.destination}</span>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="departureDate" className={labelClass}>
            ¿Cuándo os vais?
          </label>
          <input
            id="departureDate"
            type="date"
            value={params.departureDate}
            onChange={(e) => updateField("departureDate", e.target.value)}
            className={inputClass}
          />
          {errors.departureDate && <span className={errorClass}>{errors.departureDate}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="returnDate" className={labelClass}>
            ¿Cuándo volvéis?
          </label>
          <input
            id="returnDate"
            type="date"
            value={params.returnDate}
            onChange={(e) => updateField("returnDate", e.target.value)}
            className={inputClass}
          />
          {errors.returnDate && <span className={errorClass}>{errors.returnDate}</span>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="budget" className={labelClass}>
            ¿Cuál es tu presupuesto?
          </label>
          <div className="flex gap-2">
            <input
              id="budget"
              type="number"
              min={1}
              value={params.budget}
              onChange={(e) => updateField("budget", Number(e.target.value))}
              className={`flex-1 ${inputClass}`}
            />
            <select
              value={params.budgetType}
              onChange={(e) => updateField("budgetType", e.target.value as SearchParams["budgetType"])}
              className={inputClass}
            >
              <option value="total">Total</option>
              <option value="perNight">Por noche</option>
            </select>
          </div>
          {errors.budget && <span className={errorClass}>{errors.budget}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="travelers" className={labelClass}>
            ¿Cuántos viajáis?
          </label>
          <input
            id="travelers"
            type="number"
            min={1}
            value={params.travelers}
            onChange={(e) => updateField("travelers", Number(e.target.value))}
            className={inputClass}
          />
          {errors.travelers && <span className={errorClass}>{errors.travelers}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>¿Qué tipo de viaje buscas?</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((option) => {
            const tier = CATEGORY_TIER[option.value];
            const theme = tier ? TIER_THEME[tier] : null;
            const isSelected = params.category === option.value;
            const selectedClass = theme ? theme.solidBg : "bg-sunset-500";
            const unselectedClass = theme ? `${theme.softBg} ${theme.text}` : "bg-sunset-50 text-sunset-700";

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField("category", option.value)}
                aria-pressed={isSelected}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  isSelected ? `${selectedClass} text-white shadow-sm` : `${unselectedClass} hover:opacity-80`
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>¿Qué te apetece hacer?</span>
        <PreferenceChips
          selected={params.preferences}
          onChange={(preferences) => updateField("preferences", preferences)}
        />
      </div>

      <button
        type="submit"
        className="mt-2 flex items-center justify-center gap-2 rounded-full bg-sunset-500 py-3.5 text-base font-bold text-white shadow-lg shadow-sunset-500/30 transition hover:-translate-y-0.5 hover:bg-sunset-600 hover:shadow-xl active:translate-y-0"
      >
        <Icon name="plane" size={18} />
        Buscar mi viaje ideal
      </button>
    </form>
  );
}
