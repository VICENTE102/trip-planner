import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  /** Tailwind classes applied to the border+text when this tab is active, e.g. "border-emerald-500 text-emerald-700" */
  activeClassName?: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-ink-200">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              isActive
                ? (tab.activeClassName ?? "border-sunset-500 text-sunset-600")
                : "border-transparent text-ink-500 hover:text-ink-700"
            }`}
          >
            {tab.icon && <Icon name={tab.icon} size={16} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
