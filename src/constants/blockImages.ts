import type { TierLevel } from "../types";
import type { IconName } from "../components/Icon";

// Hand-picked, verified real photographs (never paintings/illustrations) —
// one per activity theme, reused across every tier/day/destination, so this
// feature makes zero image-search API calls.
export const ACTIVITY_IMAGES: Record<string, string> = {
  cultura: "https://upload.wikimedia.org/wikipedia/commons/5/59/Aerial_image_of_L%C3%BCbeck_%28view_from_the_southwest%29.jpg",
  playa: "https://upload.wikimedia.org/wikipedia/commons/9/96/Barbados_beach.jpg",
  naturaleza: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Senderismo-GR-11-Prineos.jpg",
  compras: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Wet_market_in_Singapore_2.jpg",
  relax: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Massage_Frankfurt.jpg",
  familia: "https://upload.wikimedia.org/wikipedia/commons/9/97/Houston_Zoo_entrance.jpg",
  gastronomia: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Wine_sampling.jpg",
  llegada: "https://upload.wikimedia.org/wikipedia/commons/9/9d/LSZH_001.jpg",
  orientacion: "https://upload.wikimedia.org/wikipedia/commons/2/26/Ximending_rainbow_crossing_201910.jpg",
};

export const RESTAURANT_IMAGES: Record<TierLevel, string> = {
  barato: "https://upload.wikimedia.org/wikipedia/commons/d/da/Fruit_Stand.JPG",
  medio: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Restaurant_in_The_Mus%C3%A9e_d%27Orsay.jpg",
  caro: "https://upload.wikimedia.org/wikipedia/commons/0/07/Jacques_Lameloise_DSCF6580.jpg",
};

// Used when an activity id has no curated photo (e.g. future new templates)
// and as the <Thumbnail> fallback icon when an image fails to load.
export const ACTIVITY_FALLBACK_ICON: IconName = "compass";
export const RESTAURANT_FALLBACK_ICON: IconName = "sun";

export function getActivityImage(activityId: string): string | null {
  return ACTIVITY_IMAGES[activityId] ?? null;
}

export function getRestaurantImage(tier: TierLevel): string | null {
  return RESTAURANT_IMAGES[tier] ?? null;
}
