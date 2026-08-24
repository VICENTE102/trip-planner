import type { Itinerary, ItineraryDay, SearchParams, TierLevel } from "../types";
import { DayCard } from "./DayCard";
import { ItineraryNote } from "./ItineraryNote";

interface ItineraryPreviewProps {
  itinerary: Itinerary;
  searchParams: SearchParams;
  tier: TierLevel;
  editable?: boolean;
  onUpdateDay?: (day: ItineraryDay) => void;
}

export function ItineraryPreview({ itinerary, searchParams, tier, editable, onUpdateDay }: ItineraryPreviewProps) {
  return (
    <>
      <ItineraryNote />
      <ol className="grid gap-4 lg:grid-cols-2">
        {itinerary.days.map((day) => (
          <li key={day.dayNumber}>
            <DayCard
              day={day}
              searchParams={searchParams}
              tier={tier}
              editable={editable}
              onUpdateDay={onUpdateDay}
            />
          </li>
        ))}
      </ol>
    </>
  );
}
