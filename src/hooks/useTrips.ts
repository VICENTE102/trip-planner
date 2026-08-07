import { useCallback, useEffect, useState } from "react";
import type { Trip } from "../types";
import { localTripStorage } from "../services/tripStorage";

export function useTrips() {
  // Lazy-init directamente desde localStorage (no [] + efecto): un consumidor
  // como TripDetailScreen busca un id concreto en el primer render, y un
  // estado inicial vacío haría fallar esa búsqueda antes de que el efecto
  // tuviera ocasión de rellenarlo.
  const [trips, setTrips] = useState<Trip[]>(() => localTripStorage.getAll());

  const refresh = useCallback(() => {
    setTrips(localTripStorage.getAll());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveTrip = useCallback(
    (trip: Trip) => {
      localTripStorage.save(trip);
      refresh();
    },
    [refresh],
  );

  const removeTrip = useCallback(
    (id: string) => {
      localTripStorage.remove(id);
      refresh();
    },
    [refresh],
  );

  return { trips, saveTrip, removeTrip };
}
