import { useNavigate } from "react-router-dom";
import { SearchForm } from "../components/SearchForm";
import { WorldCollage } from "../components/WorldCollage";
import { Icon } from "../components/Icon";
import type { SearchParams } from "../types";
import { generateTrip } from "../services/trip-api.client";

const GENERATION_STORAGE_KEY = "tripplanner:lastGeneration";

export function SearchScreen() {
  const navigate = useNavigate();

  async function handleSubmit(params: SearchParams) {
    // El viaje que se muestra en /results siempre se genera en el cliente
    // (searchService.ts), no a partir de esta llamada — esta solo registra
    // la búsqueda en el backend (Fase 11, persistencia best-effort). Si
    // falla o el backend no está disponible (p. ej. en `npm run dev` sin
    // `vercel dev`), no debe bloquear al usuario para ver sus propuestas.
    try {
      const generation = await generateTrip(params);
      sessionStorage.setItem(GENERATION_STORAGE_KEY, JSON.stringify(generation));
    } catch (error) {
      console.warn("No se pudo registrar la búsqueda en el backend:", error);
    }
    navigate("/results", { state: { searchParams: params } });
  }

  return (
    <section className="relative overflow-hidden">
      <WorldCollage />
      <div className="absolute inset-0 bg-ink-900/72" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/50 via-transparent to-ink-900/70" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-14 lg:py-20">
        <div className="animate-fade-in-up text-center text-white">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-sunset-200">
            <Icon name="sun" size={16} />
            Bienvenido a TripPlanner
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold lg:text-6xl">¿A dónde vamos?</h1>
          <p className="mt-3 text-white/80 lg:text-lg">
            El mundo entero está esperando. Cuéntanos tu viaje ideal.
          </p>
        </div>

        <SearchForm onSubmit={handleSubmit} />
      </div>
    </section>
  );
}
