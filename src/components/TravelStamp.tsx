import { Icon } from "./Icon";
import type { IconName } from "./Icon";

interface TravelStampProps {
  label: string;
  icon: IconName;
  isSelected: boolean;
  onClick: () => void;
  /** Solid fill classes applied when selected, e.g. "bg-emerald-500" */
  solidBgClass: string;
  /** Left stripe + icon-badge color when unselected, e.g. "border-emerald-400 bg-emerald-400/20" */
  stripeClass: string;
  /** Rest-state tilt utility, e.g. "-rotate-2" — varies per item for an organic, non-cloned feel */
  tiltClass: string;
}

// Shaped like a hanging luggage tag: clipped corner + a small eyelet, swings
// and settles flat ("stamped") when selected instead of just flipping color.
export function TravelStamp({
  label,
  icon,
  isSelected,
  onClick,
  solidBgClass,
  stripeClass,
  tiltClass,
}: TravelStampProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}
      className={`relative flex items-center gap-2 border-l-4 py-2 pl-3 pr-4 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:rotate-0 hover:shadow-md ${
        isSelected
          ? `animate-tag-swing ${solidBgClass} border-white/50 text-white`
          : `${tiltClass} ${stripeClass} bg-white/10 text-white/90`
      }`}
    >
      <span
        className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
          isSelected ? "bg-white/50" : "bg-white/25"
        }`}
        aria-hidden="true"
      />
      <span
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${
          isSelected ? "bg-white/25" : "bg-white/10"
        }`}
      >
        <Icon name={icon} size={12} filled />
      </span>
      {label}
    </button>
  );
}
