import { useState } from "react";
import type { Itinerary, ItineraryDay, SearchParams, TierLevel } from "../types";
import { TIER_THEME } from "../constants/tierTheme";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";
import { DayCard } from "./DayCard";
import { DayMapLazy } from "./DayMapLazy";
import { DayRoute } from "./DayRoute";
import { ItineraryNote } from "./ItineraryNote";

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

      <ItineraryNote />

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
        {/* `lg:h-full` es lo que devuelve al mapa una altura de referencia:
            sin él, el `flex-1` de MAP_BOX_CLASSES se mide contra una columna
            sin altura propia y el mapa encoge hasta lo que ocupe el
            recorrido. `min-h-0` deja que la columna quepa en la fila en vez
            de estirarla. */}
        <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
          <DayMapLazy stops={selectedDay.stops} tier={tier} />
          <DayRoute stops={selectedDay.stops} tier={tier} />
        </div>
      </div>
    </div>
  );
}
