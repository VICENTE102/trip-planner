import type { Itinerary, SearchParams, TierLevel } from "../types";
import { DayCard } from "./DayCard";

interface ItineraryPreviewProps {
  itinerary: Itinerary;
  searchParams: SearchParams;
  tier: TierLevel;
}

export function ItineraryPreview({ itinerary, searchParams, tier }: ItineraryPreviewProps) {
  return (
    <ol className="grid gap-4 lg:grid-cols-2">
      {itinerary.days.map((day) => (
        <li key={day.dayNumber}>
          <DayCard day={day} searchParams={searchParams} tier={tier} />
        </li>
      ))}
    </ol>
  );
}
