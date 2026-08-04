import type { Trip } from "../types";

const STORAGE_KEY = "trips";

export interface TripStorage {
  getAll(): Trip[];
  getById(id: string): Trip | undefined;
  save(trip: Trip): void;
  remove(id: string): void;
}

function isValidTrip(value: unknown): value is Trip {
  return (
    typeof value === "object" &&
    value !== null &&
    "proposal" in value &&
    "searchParams" in value
  );
}

function readAll(): Trip[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown[];
    const valid = parsed.filter(isValidTrip);
    if (valid.length !== parsed.length) {
      writeAll(valid);
    }
    return valid;
  } catch {
    return [];
  }
}

function writeAll(trips: Trip[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export const localTripStorage: TripStorage = {
  getAll: readAll,
  getById(id) {
    return readAll().find((trip) => trip.id === id);
  },
  save(trip) {
    const trips = readAll().filter((t) => t.id !== trip.id);
    writeAll([trip, ...trips]);
  },
  remove(id) {
    writeAll(readAll().filter((trip) => trip.id !== id));
  },
};
