import { useState } from "react";
import type { FormEvent } from "react";
import type { SearchParams, TierLevel, TripCategory } from "../types";
import { validateSearchParams } from "../utils/validation";
import type { SearchFormErrors } from "../utils/validation";
import { PreferenceChips } from "./PreferenceChips";
import { Icon } from "./Icon";
import { TravelStamp } from "./TravelStamp";
import { TIER_THEME } from "../constants/tierTheme";

interface SearchFormProps {
  onSubmit: (params: SearchParams) => Promise<void>;
}

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const initialParams: SearchParams = {
  origin: "",
  destination: "",
  departureDate: tomorrow,
  returnDate: nextWeek,
  budget: 500,
  travelers: 1,
  children: 0,
  category: "equilibrado",
  preferences: [],
};

const CATEGORY_TIER: Record<TripCategory, TierLevel> = {
  economico: "barato",
  equilibrado: "medio",
  comodo: "caro",
};

const CATEGORY_OPTIONS: { value: TripCategory; label: string }[] = [
  { value: "economico", label: "Económico" },
  { value: "equilibrado", label: "Equilibrado" },
  { value: "comodo", label: "Cómodo" },
];

const CATEGORY_TILT_CLASSES = ["-rotate-2", "rotate-2", "-rotate-1"];

const inputClass =
  "w-full border-0 border-b-2 border-white/30 bg-transparent px-0.5 py-2 text-lg text-white placeholder:text-white/40 transition focus:border-sunset-400 focus:outline-none";
const labelClass = "font-heading text-lg font-semibold text-white";
const errorClass = "text-sm text-rose-300";

export function SearchForm({ onSubmit }: SearchFormProps) {
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [errors, setErrors] = useState<SearchFormErrors>({});
  const [isTakingOff, setIsTakingOff] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Raw text for the number inputs, kept separate from the numeric params.
  // Binding the input directly to a number forces `Number("")` -> 0 back
  // into the field on every keystroke, which is what glued a "0" to the
  // front while typing.
  const [budgetInput, setBudgetInput] = useState(String(initialParams.budget));
  const [travelersInput, setTravelersInput] = useState(String(initialParams.travelers));
  const [childrenInput, setChildrenInput] = useState(String(initialParams.children));

  function updateField<K extends keyof SearchParams>(field: K, value: SearchParams[K]) {
    setParams((prev) => ({ ...prev, [field]: value }));
  }

  function handleBudgetChange(raw: string) {
    setBudgetInput(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && !Number.isNaN(parsed)) {
      updateField("budget", parsed);
    }
  }

  function handleBudgetBlur() {
    if (budgetInput.trim() === "") {
      updateField("budget", 0);
    }
  }

  function handleTravelersChange(raw: string) {
    setTravelersInput(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && !Number.isNaN(parsed)) {
      updateField("travelers", parsed);
    }
  }

  function handleTravelersBlur() {
    if (travelersInput.trim() === "") {
      setTravelersInput("1");
      updateField("travelers", 1);
    }
  }

  function handleChildrenChange(raw: string) {
    setChildrenInput(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && !Number.isNaN(parsed)) {
      updateField("children", parsed);
    }
  }

  function handleChildrenBlur() {
    if (childrenInput.trim() === "") {
      setChildrenInput("0");
      updateField("children", 0);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateSearchParams(params);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitError(null);
    setIsTakingOff(true);

    // let the takeoff animation play before triggering the search
    await new Promise((resolve) => setTimeout(resolve, 450));

    try {
      await onSubmit(params);
      // on success the parent navigates away, so no need to reset state here
    } catch (error) {
      setIsTakingOff(false);
      setSubmitError(error instanceof Error ? error.message : "No se pudo generar el viaje. Inténtalo de nuevo.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="animate-fade-in-up flex flex-col gap-1.5" style={{ animationDelay: "0ms" }}>
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

        <div className="animate-fade-in-up flex flex-col gap-1.5" style={{ animationDelay: "60ms" }}>
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

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="animate-fade-in-up flex flex-col gap-1.5" style={{ animationDelay: "120ms" }}>
          <label htmlFor="departureDate" className={labelClass}>
            ¿Cuándo os vais?
          </label>
          <input
            id="departureDate"
            type="date"
            value={params.departureDate}
            onChange={(e) => updateField("departureDate", e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
          {errors.departureDate && <span className={errorClass}>{errors.departureDate}</span>}
        </div>

        <div className="animate-fade-in-up flex flex-col gap-1.5" style={{ animationDelay: "180ms" }}>
          <label htmlFor="returnDate" className={labelClass}>
            ¿Cuándo volvéis?
          </label>
          <input
            id="returnDate"
            type="date"
            value={params.returnDate}
            onChange={(e) => updateField("returnDate", e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />
          {errors.returnDate && <span className={errorClass}>{errors.returnDate}</span>}
        </div>
      </div>

      <div className="animate-fade-in-up flex flex-col gap-1.5" style={{ animationDelay: "240ms" }}>
        <label htmlFor="budget" className={labelClass}>
          ¿Cuál es tu presupuesto total?
        </label>
        <input
          id="budget"
          type="number"
          min={1}
          placeholder="Ej. 500"
          value={budgetInput}
          onChange={(e) => handleBudgetChange(e.target.value)}
          onBlur={handleBudgetBlur}
          className={`${inputClass} max-w-xs`}
        />
        {errors.budget && <span className={errorClass}>{errors.budget}</span>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="animate-fade-in-up flex flex-col gap-1.5" style={{ animationDelay: "300ms" }}>
          <label htmlFor="travelers" className={labelClass}>
            ¿Cuántos adultos viajáis?
          </label>
          <input
            id="travelers"
            type="number"
            min={1}
            value={travelersInput}
            onChange={(e) => handleTravelersChange(e.target.value)}
            onBlur={handleTravelersBlur}
            className={inputClass}
          />
          {errors.travelers && <span className={errorClass}>{errors.travelers}</span>}
        </div>

        <div className="animate-fade-in-up flex flex-col gap-1.5" style={{ animationDelay: "330ms" }}>
          <label htmlFor="children" className={labelClass}>
            ¿Cuántos menores? (opcional)
          </label>
          <input
            id="children"
            type="number"
            min={0}
            value={childrenInput}
            onChange={(e) => handleChildrenChange(e.target.value)}
            onBlur={handleChildrenBlur}
            className={inputClass}
          />
        </div>
      </div>

      <div className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: "360ms" }}>
        <span className={labelClass}>¿Qué tipo de viaje buscas?</span>
        <div className="flex flex-wrap gap-3">
          {CATEGORY_OPTIONS.map((option, index) => {
            const theme = TIER_THEME[CATEGORY_TIER[option.value]];
            const isSelected = params.category === option.value;

            return (
              <TravelStamp
                key={option.value}
                label={option.label}
                icon="plane"
                isSelected={isSelected}
                onClick={() => updateField("category", option.value)}
                solidBgClass={theme.solidBg}
                stripeClass={theme.border}
                tiltClass={CATEGORY_TILT_CLASSES[index % CATEGORY_TILT_CLASSES.length]}
              />
            );
          })}
        </div>
      </div>

      <div className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: "420ms" }}>
        <span className={labelClass}>¿Qué te apetece hacer?</span>
        <PreferenceChips
          selected={params.preferences}
          onChange={(preferences) => updateField("preferences", preferences)}
        />
      </div>

      <button
        type="submit"
        disabled={isTakingOff}
        className="group animate-fade-in-up mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-lagoon-500 to-indigo-600 py-3.5 font-heading text-lg font-bold text-white shadow-lg shadow-indigo-900/30 transition hover:-translate-y-0.5 hover:from-lagoon-600 hover:to-indigo-700 hover:shadow-xl active:translate-y-0 disabled:cursor-wait"
        style={{ animationDelay: "480ms" }}
      >
        <span className="relative flex items-center">
          <span
            className="pointer-events-none absolute right-full mr-1 flex items-center gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-70"
            aria-hidden="true"
          >
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          </span>
          <Icon
            name="plane"
            size={18}
            className={isTakingOff ? "animate-plane-takeoff" : "transition-transform duration-300 group-hover:translate-x-1.5"}
          />
        </span>
        <span className={isTakingOff ? "animate-fade-out" : ""}>Buscar mi viaje ideal</span>
      </button>
      {submitError && <p className={`text-center ${errorClass}`}>{submitError}</p>}
    </form>
  );
}
