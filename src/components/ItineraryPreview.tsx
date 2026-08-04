import type { Itinerary, SearchParams } from "../types";
import { formatDate } from "../utils/dates";
import { Icon } from "./Icon";
import { ExternalLinkButton } from "./ExternalLinkButton";
import { getActivityLink, getGoogleMapsLink } from "../services/deepLinks";

interface ItineraryPreviewProps {
  itinerary: Itinerary;
  searchParams: SearchParams;
}

export function ItineraryPreview({ itinerary, searchParams }: ItineraryPreviewProps) {
  return (
    <ol className="grid gap-3 lg:grid-cols-2">
      {itinerary.days.map((day) => (
        <li key={day.dayNumber} className="rounded-xl border border-ink-200 bg-white p-3 text-sm">
          <p className="font-semibold text-ink-900">
            Día {day.dayNumber} · {formatDate(day.date)}
          </p>
          <dl className="mt-2 flex flex-col gap-1.5 text-ink-700">
            <div>
              <dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-sunset-600">
                <Icon name="sun" size={13} />
                Mañana
              </dt>
              <dd>{day.morning}</dd>
              {!day.isArrivalDay && (
                <div className="mt-1.5">
                  <ExternalLinkButton
                    href={getActivityLink(day.morning, searchParams.destination)}
                    label="Reservar actividad"
                    icon="compass"
                    variant="activity"
                  />
                </div>
              )}
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">
                Restaurante recomendado
              </dt>
              <dd>
                {day.restaurant.name} — {day.restaurant.description} ({day.restaurant.area})
              </dd>
              <div className="mt-1.5">
                <ExternalLinkButton
                  href={getGoogleMapsLink(day.restaurant.name, searchParams.destination)}
                  label="Ver ubicación"
                  icon="mapPin"
                  variant="location"
                />
              </div>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-lagoon-600">Tarde</dt>
              <dd>{day.afternoon}</dd>
              {!day.isArrivalDay && (
                <div className="mt-1.5">
                  <ExternalLinkButton
                    href={getActivityLink(day.afternoon, searchParams.destination)}
                    label="Reservar actividad"
                    icon="compass"
                    variant="activity"
                  />
                </div>
              )}
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ink-900">
                <Icon name="moon" size={13} />
                Noche
              </dt>
              <dd>{day.night}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ol>
  );
}
