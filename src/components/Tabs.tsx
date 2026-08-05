import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  /** Solid background classes applied when this tab is active, e.g. "bg-emerald-500" */
  activeBgClass?: string;
  /** Text-color class for the footprint marker under the active tab, e.g. "text-emerald-500" */
  markerColorClass?: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

const DEFAULT_ACTIVE_BG = "bg-sunset-500";
const DEFAULT_MARKER = "text-sunset-500";

export function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <div className="relative">
      {/* the dotted trail every tab sits along */}
      <div
        className="pointer-events-none absolute inset-x-1 bottom-3 border-t-2 border-dashed border-ink-200"
        aria-hidden="true"
      />

      <div role="tablist" className="relative flex flex-wrap gap-3 pb-6">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const activeBg = tab.activeBgClass ?? DEFAULT_ACTIVE_BG;
          const markerColor = tab.markerColorClass ?? DEFAULT_MARKER;

          return (
            <div key={tab.id} className="relative">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? `${activeBg} -translate-y-0.5 text-white shadow-md`
                    : "border border-ink-200 bg-white text-ink-600 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
              >
                {tab.icon && <Icon name={tab.icon} size={15} filled={isActive} />}
                {tab.label}
              </button>

              {isActive && (
                <span
                  className={`pointer-events-none absolute left-1/2 top-full -mt-1 animate-tab-hop ${markerColor}`}
                  aria-hidden="true"
                >
                  <Icon name="footprint" size={14} filled />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
