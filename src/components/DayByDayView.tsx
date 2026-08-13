import { useState } from "react";
import type { Itinerary, ItineraryDay, SearchParams, TierLevel } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";
import { DayCard } from "./DayCard";
import { DayMapLazy } from "./DayMapLazy";

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

      {/* El `key` va en la tarjeta, no en la rejilla. Estando en la rejilla,
          React desmontaba y volvía a montar TODO el subárbol en cada cambio
          de día, mapa incluido: con MapLibre eso significa recrear el
          contexto WebGL y volver a descargar el estilo cada vez que se pulsa
          un número. Ahora solo se reinicia la animación de la tarjeta y el
          mapa sobrevive, que es lo que le permite reencuadrar en vez de
          parpadear. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <DayCard
          key={selectedDayNumber}
          className="animate-slide-in-trail"
          day={selectedDay}
          searchParams={searchParams}
          tier={tier}
          imageOnRight={false}
          editable={editable}
          onUpdateDay={onUpdateDay}
        />
        <DayMapLazy stops={selectedDay.stops} tier={tier} />
      </div>
    </div>
  );
}
