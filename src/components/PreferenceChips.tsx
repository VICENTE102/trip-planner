import { PREFERENCES } from "../types";
import type { Preference } from "../types";

interface PreferenceChipsProps {
  selected: Preference[];
  onChange: (preferences: Preference[]) => void;
}

export function PreferenceChips({ selected, onChange }: PreferenceChipsProps) {
  function toggle(preference: Preference) {
    if (selected.includes(preference)) {
      onChange(selected.filter((p) => p !== preference));
    } else {
      onChange([...selected, preference]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PREFERENCES.map((preference) => {
        const isSelected = selected.includes(preference);
        return (
          <button
            key={preference}
            type="button"
            onClick={() => toggle(preference)}
            aria-pressed={isSelected}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              isSelected
                ? "border-lagoon-500 bg-lagoon-500 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:border-lagoon-400"
            }`}
          >
            {preference}
          </button>
        );
      })}
    </div>
  );
}
