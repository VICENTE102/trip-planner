import type { ItineraryDay, Restaurant } from "../types";

export type DayTextField = "morning" | "afternoon" | "night";

export function getEffectiveText(day: ItineraryDay, field: DayTextField): string {
  return day.edits?.[field] ?? day[field];
}

export function isFieldEdited(day: ItineraryDay, field: DayTextField): boolean {
  return day.edits?.[field] !== undefined;
}

export function getEffectiveRestaurant(day: ItineraryDay): Restaurant {
  const overrides = day.edits?.restaurant;
  return overrides ? { ...day.restaurant, ...overrides } : day.restaurant;
}

export function isRestaurantEdited(day: ItineraryDay): boolean {
  const overrides = day.edits?.restaurant;
  return !!overrides && Object.keys(overrides).length > 0;
}

function withEdits(day: ItineraryDay, edits: ItineraryDay["edits"]): ItineraryDay {
  const hasAnyEdit = !!edits && Object.values(edits).some((value) => value !== undefined);
  return { ...day, edits: hasAnyEdit ? edits : undefined };
}

export function setDayTextEdit(day: ItineraryDay, field: DayTextField, value: string): ItineraryDay {
  const trimmed = value.trim();
  const { [field]: _removed, ...rest } = day.edits ?? {};
  const edits = trimmed === "" || trimmed === day[field] ? rest : { ...rest, [field]: trimmed };
  return withEdits(day, edits);
}

export function clearDayTextEdit(day: ItineraryDay, field: DayTextField): ItineraryDay {
  if (day.edits?.[field] === undefined) return day;
  const { [field]: _removed, ...rest } = day.edits;
  return withEdits(day, rest);
}

export function setRestaurantEdit(
  day: ItineraryDay,
  values: Pick<Restaurant, "name" | "description" | "area">,
): ItineraryDay {
  const overrides: Partial<Omit<Restaurant, "tier">> = {};
  (Object.keys(values) as (keyof typeof values)[]).forEach((key) => {
    const value = values[key].trim();
    if (value !== "" && value !== day.restaurant[key]) {
      overrides[key] = value;
    }
  });
  const { restaurant: _removed, ...rest } = day.edits ?? {};
  const edits = Object.keys(overrides).length > 0 ? { ...rest, restaurant: overrides } : rest;
  return withEdits(day, edits);
}

export function clearRestaurantEdit(day: ItineraryDay): ItineraryDay {
  if (!day.edits?.restaurant) return day;
  const { restaurant: _removed, ...rest } = day.edits;
  return withEdits(day, rest);
}
