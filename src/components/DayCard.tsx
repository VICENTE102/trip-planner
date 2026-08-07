import { useState } from "react";
import type { ItineraryDay, Restaurant, SearchParams, TierLevel } from "../types";
import { formatDate } from "../utils/dates";
import {
  clearDayTextEdit,
  clearRestaurantEdit,
  getEffectiveRestaurant,
  getEffectiveText,
  isFieldEdited,
  isRestaurantEdited,
  setDayTextEdit,
  setRestaurantEdit,
} from "../utils/itineraryEdits";
import type { DayTextField } from "../utils/itineraryEdits";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { ExternalLinkButton } from "./ExternalLinkButton";
import { Thumbnail } from "./Thumbnail";
import { getActivityLink, getGoogleMapsLink } from "../services/deepLinks";
import {
  ACTIVITY_FALLBACK_ICON,
  RESTAURANT_FALLBACK_ICON,
  getActivityImage,
  getRestaurantImage,
} from "../constants/blockImages";
import { TIER_THEME } from "../constants/tierTheme";

interface DayCardProps {
  day: ItineraryDay;
  searchParams: SearchParams;
  tier: TierLevel;
  imageOnRight?: boolean;
  editable?: boolean;
  onUpdateDay?: (day: ItineraryDay) => void;
}

type EditingField = DayTextField | "restaurant" | null;

const DAY_TYPE_LABELS: Record<string, string> = {
  cultura: "Explora",
  playa: "Playa",
  naturaleza: "Aventura",
  compras: "Compras",
  relax: "Relax",
  familia: "Familia",
  gastronomia: "Sabores",
};

function getDayTypeLabel(day: ItineraryDay): string {
  if (day.isArrivalDay) return "Llegada";
  return DAY_TYPE_LABELS[day.morningActivityId] ?? DAY_TYPE_LABELS[day.afternoonActivityId] ?? "Explora";
}

const fieldButtonBase = "rounded-full px-3 py-1.5 text-xs font-bold transition";

function TextEditForm({
  initialValue,
  onSave,
  onCancel,
  variant = "light",
}: {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  variant?: "light" | "dark";
}) {
  const [value, setValue] = useState(initialValue);
  const isDark = variant === "dark";

  return (
    <div className="mt-1 flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        autoFocus
        className={`w-full rounded-lg border p-2 text-sm focus:outline-none ${
          isDark
            ? "border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:border-white/60"
            : "border-ink-200 text-ink-900 focus:border-ink-400"
        }`}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(value)}
          className={`${fieldButtonBase} ${isDark ? "bg-white text-ink-900" : "bg-ink-900 text-white"}`}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${fieldButtonBase} border ${
            isDark ? "border-white/40 text-white/80" : "border-ink-200 text-ink-600"
          }`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function RestaurantEditForm({
  restaurant,
  onSave,
  onCancel,
}: {
  restaurant: Restaurant;
  onSave: (values: { name: string; description: string; area: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [area, setArea] = useState(restaurant.area);
  const inputClass =
    "mt-0.5 w-full rounded-lg border border-ink-200 p-2 text-sm text-ink-900 focus:border-ink-400 focus:outline-none";

  return (
    <div className="mt-1 flex flex-col gap-2">
      <label className="text-xs font-semibold text-ink-500">
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="text-xs font-semibold text-ink-500">
        Descripción
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>
      <label className="text-xs font-semibold text-ink-500">
        Zona
        <input value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave({ name, description, area })}
          className={`${fieldButtonBase} bg-ink-900 text-white`}
        >
          Guardar
        </button>
        <button type="button" onClick={onCancel} className={`${fieldButtonBase} border border-ink-200 text-ink-600`}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function EditControls({
  isEdited,
  onEdit,
  onRestore,
  dark = false,
}: {
  isEdited: boolean;
  onEdit: () => void;
  onRestore: () => void;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-none items-center gap-2">
      {isEdited && (
        <button
          type="button"
          onClick={onRestore}
          className={`text-xs font-semibold underline underline-offset-2 ${
            dark ? "text-white/60 hover:text-white" : "text-ink-400 hover:text-ink-600"
          }`}
        >
          Restaurar
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar"
        className={dark ? "text-white/60 hover:text-white" : "text-ink-400 hover:text-ink-600"}
      >
        <Icon name="edit" size={13} />
      </button>
    </div>
  );
}

interface TimelineNodeProps {
  icon: IconName;
  markerClass: string;
  title: string;
  titleColorClass: string;
  text: string;
  imageSrc: string | null;
  imageFallbackIcon: IconName;
  imageShape: "square" | "circle";
  imageOnRight: boolean;
  action?: React.ReactNode;
  editable?: boolean;
  isEdited?: boolean;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onRestore?: () => void;
  editSlot?: React.ReactNode;
}

function TimelineNode({
  icon,
  markerClass,
  title,
  titleColorClass,
  text,
  imageSrc,
  imageFallbackIcon,
  imageShape,
  imageOnRight,
  action,
  editable,
  isEdited,
  isEditing,
  onStartEdit,
  onRestore,
  editSlot,
}: TimelineNodeProps) {
  return (
    <div className="relative flex gap-3">
      <div
        className={`relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full text-white shadow-sm ${markerClass}`}
      >
        <Icon name={icon} size={14} filled />
      </div>
      <div className={`flex flex-1 gap-3 ${imageOnRight && !isEditing ? "flex-row-reverse" : ""}`}>
        {!isEditing && (
          <Thumbnail
            src={imageSrc}
            alt={text}
            fallbackIcon={imageFallbackIcon}
            size={imageShape === "circle" ? "sm" : "lg"}
            shape={imageShape}
          />
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs font-bold uppercase tracking-wide ${titleColorClass}`}>{title}</p>
            {editable && !isEditing && onStartEdit && onRestore && (
              <EditControls isEdited={!!isEdited} onEdit={onStartEdit} onRestore={onRestore} />
            )}
          </div>
          {isEditing ? (
            editSlot
          ) : (
            <>
              <p className="text-sm text-ink-700">{text}</p>
              {action && <div className="mt-1.5">{action}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DayCard({
  day,
  searchParams,
  tier,
  imageOnRight = day.dayNumber % 2 === 0,
  editable = false,
  onUpdateDay,
}: DayCardProps) {
  const theme = TIER_THEME[tier];
  const [editingField, setEditingField] = useState<EditingField>(null);

  const morningText = getEffectiveText(day, "morning");
  const afternoonText = getEffectiveText(day, "afternoon");
  const nightText = getEffectiveText(day, "night");
  const restaurant = getEffectiveRestaurant(day);

  function saveTextField(field: DayTextField, value: string) {
    onUpdateDay?.(setDayTextEdit(day, field, value));
    setEditingField(null);
  }

  function restoreTextField(field: DayTextField) {
    onUpdateDay?.(clearDayTextEdit(day, field));
  }

  function saveRestaurant(values: { name: string; description: string; area: string }) {
    onUpdateDay?.(setRestaurantEdit(day, values));
    setEditingField(null);
  }

  function restoreRestaurant() {
    onUpdateDay?.(clearRestaurantEdit(day));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className={`font-heading text-4xl font-bold leading-none ${theme.accentText}`}>
              {String(day.dayNumber).padStart(2, "0")}
            </span>
            <span className="text-sm text-ink-500">{formatDate(day.date)}</span>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${theme.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${theme.solidBg}`} />
            {getDayTypeLabel(day)}
          </span>
        </div>

        <div className="relative mt-4 flex flex-col gap-4">
          <div
            className="absolute bottom-2 left-[13px] top-2 border-l-2 border-dashed border-ink-200"
            aria-hidden="true"
          />

          <TimelineNode
            icon="sun"
            markerClass={theme.solidBg}
            title="Mañana"
            titleColorClass="text-sunset-600"
            text={morningText}
            imageSrc={getActivityImage(day.morningActivityId)}
            imageFallbackIcon={ACTIVITY_FALLBACK_ICON}
            imageShape="square"
            imageOnRight={imageOnRight}
            editable={editable}
            isEdited={isFieldEdited(day, "morning")}
            isEditing={editingField === "morning"}
            onStartEdit={() => setEditingField("morning")}
            onRestore={() => restoreTextField("morning")}
            editSlot={
              <TextEditForm
                initialValue={morningText}
                onSave={(value) => saveTextField("morning", value)}
                onCancel={() => setEditingField(null)}
              />
            }
            action={
              !day.isArrivalDay && (
                <ExternalLinkButton
                  href={getActivityLink(morningText, searchParams.destination)}
                  label="Reservar actividad"
                  icon="compass"
                  variant="activity"
                />
              )
            }
          />

          <TimelineNode
            icon="utensils"
            markerClass="bg-ink-500"
            title="Restaurante recomendado"
            titleColorClass="text-ink-500"
            text={`${restaurant.name} — ${restaurant.description} (${restaurant.area})`}
            imageSrc={getRestaurantImage(restaurant.tier)}
            imageFallbackIcon={RESTAURANT_FALLBACK_ICON}
            imageShape="circle"
            imageOnRight={imageOnRight}
            editable={editable}
            isEdited={isRestaurantEdited(day)}
            isEditing={editingField === "restaurant"}
            onStartEdit={() => setEditingField("restaurant")}
            onRestore={restoreRestaurant}
            editSlot={<RestaurantEditForm restaurant={restaurant} onSave={saveRestaurant} onCancel={() => setEditingField(null)} />}
            action={
              <ExternalLinkButton
                href={getGoogleMapsLink(restaurant.name, searchParams.destination)}
                label="Ver ubicación"
                icon="mapPin"
                variant="location"
              />
            }
          />

          <TimelineNode
            icon="compass"
            markerClass={theme.solidBg}
            title="Tarde"
            titleColorClass="text-lagoon-600"
            text={afternoonText}
            imageSrc={getActivityImage(day.afternoonActivityId)}
            imageFallbackIcon={ACTIVITY_FALLBACK_ICON}
            imageShape="square"
            imageOnRight={imageOnRight}
            editable={editable}
            isEdited={isFieldEdited(day, "afternoon")}
            isEditing={editingField === "afternoon"}
            onStartEdit={() => setEditingField("afternoon")}
            onRestore={() => restoreTextField("afternoon")}
            editSlot={
              <TextEditForm
                initialValue={afternoonText}
                onSave={(value) => saveTextField("afternoon", value)}
                onCancel={() => setEditingField(null)}
              />
            }
            action={
              !day.isArrivalDay && (
                <ExternalLinkButton
                  href={getActivityLink(afternoonText, searchParams.destination)}
                  label="Reservar actividad"
                  icon="compass"
                  variant="activity"
                />
              )
            }
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-ink-900 to-[#2e1f45] px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/70">
            <Icon name="moon" size={13} />
            Noche
          </p>
          {editable && editingField !== "night" && (
            <EditControls
              isEdited={isFieldEdited(day, "night")}
              onEdit={() => setEditingField("night")}
              onRestore={() => restoreTextField("night")}
              dark
            />
          )}
        </div>
        {editingField === "night" ? (
          <TextEditForm
            variant="dark"
            initialValue={nightText}
            onSave={(value) => saveTextField("night", value)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <p className="mt-1 text-sm text-white/90">{nightText}</p>
        )}
      </div>
    </div>
  );
}
