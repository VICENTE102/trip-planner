import type { ItineraryDay, SearchParams, TierLevel } from "../types";
import { formatDate } from "../utils/dates";
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
}

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
}: TimelineNodeProps) {
  return (
    <div className="relative flex gap-3">
      <div
        className={`relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full text-white shadow-sm ${markerClass}`}
      >
        <Icon name={icon} size={14} filled />
      </div>
      <div className={`flex flex-1 gap-3 ${imageOnRight ? "flex-row-reverse" : ""}`}>
        <Thumbnail
          src={imageSrc}
          alt={text}
          fallbackIcon={imageFallbackIcon}
          size={imageShape === "circle" ? "sm" : "lg"}
          shape={imageShape}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`text-xs font-bold uppercase tracking-wide ${titleColorClass}`}>{title}</p>
          <p className="text-sm text-ink-700">{text}</p>
          {action && <div className="mt-1.5">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function DayCard({ day, searchParams, tier, imageOnRight = day.dayNumber % 2 === 0 }: DayCardProps) {
  const theme = TIER_THEME[tier];

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
            text={day.morning}
            imageSrc={getActivityImage(day.morningActivityId)}
            imageFallbackIcon={ACTIVITY_FALLBACK_ICON}
            imageShape="square"
            imageOnRight={imageOnRight}
            action={
              !day.isArrivalDay && (
                <ExternalLinkButton
                  href={getActivityLink(day.morning, searchParams.destination)}
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
            text={`${day.restaurant.name} — ${day.restaurant.description} (${day.restaurant.area})`}
            imageSrc={getRestaurantImage(day.restaurant.tier)}
            imageFallbackIcon={RESTAURANT_FALLBACK_ICON}
            imageShape="circle"
            imageOnRight={imageOnRight}
            action={
              <ExternalLinkButton
                href={getGoogleMapsLink(day.restaurant.name, searchParams.destination)}
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
            text={day.afternoon}
            imageSrc={getActivityImage(day.afternoonActivityId)}
            imageFallbackIcon={ACTIVITY_FALLBACK_ICON}
            imageShape="square"
            imageOnRight={imageOnRight}
            action={
              !day.isArrivalDay && (
                <ExternalLinkButton
                  href={getActivityLink(day.afternoon, searchParams.destination)}
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
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/70">
          <Icon name="moon" size={13} />
          Noche
        </p>
        <p className="mt-1 text-sm text-white/90">{day.night}</p>
      </div>
    </div>
  );
}
