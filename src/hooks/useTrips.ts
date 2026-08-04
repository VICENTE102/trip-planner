import { useCallback, useEffect, useState } from "react";
import type { Trip } from "../types";
import { localTripStorage } from "../services/tripStorage";

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);

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
