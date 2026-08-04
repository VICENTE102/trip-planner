import { useNavigate } from "react-router-dom";
import { SearchForm } from "../components/SearchForm";
import { Icon } from "../components/Icon";
import type { SearchParams } from "../types";

export function SearchScreen() {
  const navigate = useNavigate();

  function handleSubmit(params: SearchParams) {
    navigate("/results", { state: { searchParams: params } });
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-sunset-600 to-lagoon-600" />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <Icon
        name="plane"
        size={220}
        className="pointer-events-none absolute -right-10 top-6 rotate-45 text-white/10"
      />
      <Icon
        name="compass"
        size={260}
        className="pointer-events-none absolute -left-20 -bottom-20 text-white/10"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-12 lg:py-20">
        <div className="text-center text-white">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-sunset-100">
            <Icon name="sun" size={16} />
            Bienvenido a TripPlanner
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold lg:text-5xl">¿A dónde vamos?</h1>
          <p className="mt-2 text-white/85 lg:text-lg">
            Cuéntanos tu viaje ideal y te preparamos 3 propuestas a medida.
          </p>
        </div>

        <div className="w-full max-w-3xl rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur lg:p-8">
          <SearchForm onSubmit={handleSubmit} />
        </div>
      </div>
    </section>
  );
}
