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
                ? "border-lagoon-400 bg-lagoon-400 text-ink-900"
                : "border-white/30 bg-white/5 text-white/85 hover:border-lagoon-300 hover:bg-white/10"
            }`}
          >
            {preference}
          </button>
        );
      })}
    </div>
  );
}
