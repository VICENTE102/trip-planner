import { useState } from "react";
import type { Itinerary, ItineraryDay, SearchParams, TierLevel } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";
import { DayCard } from "./DayCard";
import { DayMap } from "./DayMap";

interface DayByDayViewProps {
  itinerary: Itinerary;
  searchParams: SearchParams;
  tier: TierLevel;
  editable?: boolean;
  onUpdateDay?: (day: ItineraryDay) => void;
}

export function DayByDayView({ itinerary, searchParams, tier, editable, onUpdateDay }: DayByDayViewProps) {
  const [selectedDayNumber, setSelectedDayNumber] = useState(itinerary.days[0].dayNumber);
  const theme = TIER_THEME[tier];
  const selectedDay = itinerary.days.find((day) => day.dayNumber === selectedDayNumber) ?? itinerary.days[0];

  const dayTabs: TabItem[] = itinerary.days.map((day) => ({
    id: String(day.dayNumber),
    label: String(day.dayNumber),
    activeBgClass: theme.solidBg,
    markerColorClass: theme.accentText,
  }));

  return (
    <div>
      <Tabs
        tabs={dayTabs}
        activeId={String(selectedDayNumber)}
        onChange={(id) => setSelectedDayNumber(Number(id))}
      />

      <div key={selectedDayNumber} className="grid animate-slide-in-trail gap-4 lg:grid-cols-2 lg:items-stretch">
        <DayCard
          day={selectedDay}
          searchParams={searchParams}
          tier={tier}
          imageOnRight={false}
          editable={editable}
          onUpdateDay={onUpdateDay}
        />
        <DayMap stops={selectedDay.stops} tier={tier} />
      </div>
    </div>
  );
}
