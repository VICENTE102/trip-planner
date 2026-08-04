import { Navigate, useNavigate, useParams } from "react-router-dom";
import { localTripStorage } from "../services/tripStorage";
import { ProposalDetailView } from "../components/ProposalDetailView";
import { Icon } from "../components/Icon";

export function TripDetailScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const trip = tripId ? localTripStorage.getById(tripId) : undefined;

  if (!trip) {
    return <Navigate to="/mis-viajes" replace />;
  }

  function handleDelete() {
    if (window.confirm("¿Eliminar este viaje guardado?")) {
      localTripStorage.remove(trip!.id);
      navigate("/mis-viajes");
    }
  }

  const { searchParams, proposal } = trip;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
          <Icon name="mapPin" size={22} className="text-sunset-500" />
          {searchParams.destination}
        </h1>
        <p className="text-sm text-ink-500">
          {searchParams.origin} → {searchParams.destination} · {searchParams.departureDate} →{" "}
          {searchParams.returnDate} · {searchParams.travelers} viajero
          {searchParams.travelers > 1 ? "s" : ""}
        </p>
      </div>

      <ProposalDetailView proposal={proposal} searchParams={searchParams} />

      <button
        type="button"
        onClick={handleDelete}
        className="rounded-lg bg-sunset-50 py-3 text-base font-semibold text-sunset-700 transition hover:bg-sunset-100"
      >
        Eliminar viaje
      </button>
    </div>
  );
}
