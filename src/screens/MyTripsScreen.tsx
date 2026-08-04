import { useTrips } from "../hooks/useTrips";
import { TripCard } from "../components/TripCard";
import { Icon } from "../components/Icon";

export function MyTripsScreen() {
  const { trips, removeTrip } = useTrips();

  function handleDelete(id: string) {
    if (window.confirm("¿Eliminar este viaje guardado?")) {
      removeTrip(id);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900">
        <Icon name="suitcase" size={22} className="text-sunset-500" />
        Mis viajes
      </h1>

      {trips.length === 0 ? (
        <p className="text-sm text-ink-500">Todavía no has guardado ningún viaje.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelete={() => handleDelete(trip.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
