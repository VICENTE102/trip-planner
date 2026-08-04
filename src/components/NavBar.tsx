import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

const links: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: "/", label: "Buscar", icon: "compass", end: true },
  { to: "/mis-viajes", label: "Mis viajes", icon: "suitcase", end: false },
];

export function NavBar() {
  const location = useLocation();
  // On /results the hero photo fills the top of the page, so the nav floats
  // transparently on top of it instead of sitting in its own colored bar.
  const isOverlay = location.pathname === "/results";

  return (
    <nav
      className={
        isOverlay
          ? "absolute inset-x-0 top-0 z-20"
          : "sticky top-0 z-20 border-b border-ink-200 bg-sunset-50/95 backdrop-blur"
      }
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-1.5 py-3">
          <Icon name="plane" size={20} className={isOverlay ? "text-white" : "text-sunset-500"} />
          <span className={`font-heading text-lg font-bold ${isOverlay ? "text-white" : "text-ink-900"}`}>
            TripPlanner
          </span>
        </Link>

        <div className="flex gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isOverlay
                  ? `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
                    }`
                  : `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive ? "bg-sunset-100 text-sunset-600" : "text-ink-500 hover:text-ink-700"
                    }`
              }
            >
              <Icon name={link.icon} size={18} />
              <span className="hidden sm:inline">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
