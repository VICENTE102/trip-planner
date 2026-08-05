import type { TierLevel } from "../types";

export interface TierTheme {
  label: string;
  text: string;
  softBg: string;
  solidBg: string;
  border: string;
  badge: string;
  tabActive: string;
  accentText: string;
}

// Centralized so every screen/component uses the exact same hue per tier —
// keeps the "color per category" system from drifting out of sync.
export const TIER_THEME: Record<TierLevel, TierTheme> = {
  barato: {
    label: "Económico",
    text: "text-emerald-700",
    softBg: "bg-emerald-50",
    solidBg: "bg-emerald-500",
    border: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    tabActive: "border-emerald-500 text-emerald-700",
    accentText: "text-emerald-500",
  },
  medio: {
    label: "Equilibrado",
    text: "text-indigo-700",
    softBg: "bg-indigo-50",
    solidBg: "bg-indigo-500",
    border: "border-indigo-500",
    badge: "bg-indigo-100 text-indigo-700",
    tabActive: "border-indigo-500 text-indigo-700",
    accentText: "text-indigo-500",
  },
  caro: {
    label: "Cómodo",
    text: "text-amber-700",
    softBg: "bg-amber-50",
    solidBg: "bg-amber-500",
    border: "border-amber-500",
    badge: "bg-amber-100 text-amber-700",
    tabActive: "border-amber-500 text-amber-700",
    accentText: "text-amber-500",
  },
};
