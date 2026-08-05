import { PREFERENCES } from "../types";
import type { Preference } from "../types";
import { TravelStamp } from "./TravelStamp";
import type { IconName } from "./Icon";

interface PreferenceChipsProps {
  selected: Preference[];
  onChange: (preferences: Preference[]) => void;
}

const PREFERENCE_ICONS: Record<Preference, IconName> = {
  Playa: "sun",
  Cultura: "mapPin",
  Gastronomía: "utensils",
  "Vida nocturna": "moon",
  Naturaleza: "compass",
  Compras: "suitcase",
  Familia: "footprint",
  Relax: "sun",
};

const TILT_CLASSES = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "-rotate-3", "rotate-3", "-rotate-2", "rotate-2"];

export function PreferenceChips({ selected, onChange }: PreferenceChipsProps) {
  function toggle(preference: Preference) {
    if (selected.includes(preference)) {
      onChange(selected.filter((p) => p !== preference));
    } else {
      onChange([...selected, preference]);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {PREFERENCES.map((preference, index) => (
        <TravelStamp
          key={preference}
          label={preference}
          icon={PREFERENCE_ICONS[preference]}
          isSelected={selected.includes(preference)}
          onClick={() => toggle(preference)}
          solidBgClass="bg-lagoon-500"
          stripeClass="border-lagoon-400"
          tiltClass={TILT_CLASSES[index % TILT_CLASSES.length]}
        />
      ))}
    </div>
  );
}
