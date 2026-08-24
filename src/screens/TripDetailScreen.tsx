import { Navigate, useNavigate, useParams } from "react-router-dom";
import type { ItineraryDay } from "../types";
import { useTrips } from "../hooks/useTrips";
import { ProposalDetailView } from "../components/ProposalDetailView";
import { Icon } from "../components/Icon";
import { formatDateRange } from "../utils/dates";

export function TripDetailScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { trips, saveTrip, removeTrip } = useTrips();
  const trip = tripId ? trips.find((t) => t.id === tripId) : undefined;

  if (!trip) {
    return <Navigate to="/mis-viajes" replace />;
  }

  function handleDelete() {
    if (window.confirm("¿Eliminar este viaje guardado?")) {
      removeTrip(trip!.id);
      navigate("/mis-viajes");
    }
  }

  function handleUpdateDay(updatedDay: ItineraryDay) {
    const days = trip!.proposal.itinerary.days.map((day) =>
      day.dayNumber === updatedDay.dayNumber ? updatedDay : day,
    );
    saveTrip({
      ...trip!,
      proposal: {
        ...trip!.proposal,
        itinerary: { ...trip!.proposal.itinerary, days },
      },
    });
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
          {searchParams.origin} → {searchParams.destination} ·{" "}
          {formatDateRange(searchParams.departureDate, searchParams.returnDate)} ·{" "}
          {searchParams.travelers + searchParams.children} viajero
          {searchParams.travelers + searchParams.children > 1 ? "s" : ""}
        </p>
      </div>

      <ProposalDetailView
        proposal={proposal}
        searchParams={searchParams}
        editable
        onUpdateDay={handleUpdateDay}
      />

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
