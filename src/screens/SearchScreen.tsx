import { useNavigate } from "react-router-dom";
import { SearchForm } from "../components/SearchForm";
import { WorldCollage } from "../components/WorldCollage";
import { Icon } from "../components/Icon";
import type { SearchParams } from "../types";
import { formatTripApiError, generateTrip } from "../services/trip-api.client";

export function SearchScreen() {
  const navigate = useNavigate();

  async function handleSubmit(params: SearchParams) {
    // El viaje que se muestra en /results ES el que calcula el backend: si
    // esta llamada falla no hay nada que enseñar, así que se propaga el
    // error para que el formulario lo muestre en vez de navegar a una
    // pantalla vacía. SearchForm ya gestiona el estado de carga y el
    // mensaje de error.
    let generation;
    try {
      generation = await generateTrip(params);
    } catch (error) {
      throw new Error(formatTripApiError(error));
    }

    navigate("/results", { state: { searchParams: params, generation } });
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
