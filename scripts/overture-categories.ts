import type { PreferenceLevel, PreferenceProfile, TravelPreference } from "../server/types/trip.ts";
import type { OpeningPeriod } from "../server/types/activity.ts";

// Mapa de categorías de Overture a nuestro modelo de actividad.
//
// La clave es `basic_category`, no `taxonomy.primary`: Overture tiene unas
// 2.100 categorías finas pero publica además ~280 "cognitivamente básicas"
// pensadas justo para filtrar e iconografía. Mapear 280 es viable a mano;
// mapear 2.100 no lo es, y `basic_category` ya colapsa las variantes que no
// nos importan (art_museum, history_museum... -> museum).
//
// Estas claves NO salen de la documentación: salen de consultar los datos
// reales de Roma y Barcelona con DuckDB. Ejecuta `npm run pois:inspect` para
// ver qué categorías aparecen en una ciudad y cuáles se están quedando sin
// mapear — es la forma de ampliar esta tabla sin adivinar.
//
// Todo lo que no esté aquí se descarta. Eso es deliberado: gimnasios,
// aparcamientos, ferreterías y agencias inmobiliarias son la mayor parte de
// los ~110.000 sitios que Overture tiene solo en Roma, y ninguno es una
// actividad turística.

// Perfiles de apertura. Overture NO publica horarios de apertura, así que
// esto es una plantilla por tipo de sitio, no un dato verificado. Sustituye
// al horario aleatorio que generaba el mock, que podía cerrar un museo a las
// 18:07 un martes.
type OpeningPreset = "always" | "outdoor" | "daytime" | "museum" | "shop" | "evening";

const ALL_DAYS: OpeningPeriod["dayOfWeek"][] = [0, 1, 2, 3, 4, 5, 6];

const OPENING_PRESETS: Record<OpeningPreset, OpeningPeriod[]> = {
  // Monumentos y espacios abiertos sin puerta: visitables a cualquier hora.
  always: ALL_DAYS.map((dayOfWeek) => ({ dayOfWeek, opensAt: "00:00", closesAt: "23:59" })),
  outdoor: ALL_DAYS.map((dayOfWeek) => ({ dayOfWeek, opensAt: "07:00", closesAt: "21:00" })),
  daytime: ALL_DAYS.map((dayOfWeek) => ({ dayOfWeek, opensAt: "09:00", closesAt: "19:00" })),
  // Los museos europeos cierran típicamente los lunes: se refleja omitiendo
  // ese día en vez de fingir que abren toda la semana.
  museum: ALL_DAYS.filter((d) => d !== 1).map((dayOfWeek) => ({ dayOfWeek, opensAt: "10:00", closesAt: "18:00" })),
  shop: ALL_DAYS.filter((d) => d !== 0).map((dayOfWeek) => ({ dayOfWeek, opensAt: "10:00", closesAt: "20:00" })),
  evening: ALL_DAYS.map((dayOfWeek) => ({ dayOfWeek, opensAt: "19:00", closesAt: "23:59" })),
};

export interface CategoryRule {
  // Afinidad con cada preferencia, misma escala 0-3 que usa el usuario en el
  // formulario. Lo que no se nombra queda a 0.
  profile: Partial<Record<TravelPreference, PreferenceLevel>>;
  durationMinutes: number;
  pricePerPerson: number;
  hours: OpeningPreset;
}

// Duraciones y precios son estimaciones por categoría: un museo ronda los 90
// minutos y los 12 €, una playa media tarde y 0 €. Sigue sin ser el precio
// real de ese sitio concreto — pero es coherente y defendible, a diferencia
// del número aleatorio entre 8 y 25 que generaba el mock.
export const CATEGORY_RULES: Record<string, CategoryRule> = {
  // --- Cultura -----------------------------------------------------------
  museum: { profile: { culture: 3 }, durationMinutes: 90, pricePerPerson: 12, hours: "museum" },
  art_gallery: { profile: { culture: 2 }, durationMinutes: 45, pricePerPerson: 5, hours: "shop" },
  historic_site: { profile: { culture: 3 }, durationMinutes: 60, pricePerPerson: 8, hours: "daytime" },
  monument: { profile: { culture: 3 }, durationMinutes: 30, pricePerPerson: 0, hours: "always" },
  castle: { profile: { culture: 3 }, durationMinutes: 90, pricePerPerson: 12, hours: "museum" },
  cultural_center: { profile: { culture: 2 }, durationMinutes: 60, pricePerPerson: 5, hours: "daytime" },
  sculpture_statue: { profile: { culture: 1 }, durationMinutes: 20, pricePerPerson: 0, hours: "always" },
  christian_place_of_worship: { profile: { culture: 2 }, durationMinutes: 30, pricePerPerson: 0, hours: "daytime" },
  muslim_place_of_worship: { profile: { culture: 2 }, durationMinutes: 30, pricePerPerson: 0, hours: "daytime" },
  buddhist_place_of_worship: { profile: { culture: 2 }, durationMinutes: 30, pricePerPerson: 0, hours: "daytime" },
  jewish_place_of_worship: { profile: { culture: 2 }, durationMinutes: 30, pricePerPerson: 0, hours: "daytime" },
  place_of_worship: { profile: { culture: 2 }, durationMinutes: 30, pricePerPerson: 0, hours: "daytime" },
  theatre_venue: { profile: { culture: 2, nightlife: 1 }, durationMinutes: 120, pricePerPerson: 35, hours: "evening" },
  performing_arts_venue: {
    profile: { culture: 2, nightlife: 1 },
    durationMinutes: 120,
    pricePerPerson: 30,
    hours: "evening",
  },
  arts_and_crafts_space: { profile: { culture: 2 }, durationMinutes: 90, pricePerPerson: 25, hours: "daytime" },
  science_attraction: { profile: { culture: 2, family: 2 }, durationMinutes: 90, pricePerPerson: 14, hours: "museum" },

  // --- Vida nocturna -----------------------------------------------------
  dance_club: { profile: { nightlife: 3 }, durationMinutes: 150, pricePerPerson: 18, hours: "evening" },
  music_venue: { profile: { nightlife: 3, culture: 1 }, durationMinutes: 120, pricePerPerson: 22, hours: "evening" },
  comedy_club: { profile: { nightlife: 2 }, durationMinutes: 90, pricePerPerson: 18, hours: "evening" },
  casino: { profile: { nightlife: 2 }, durationMinutes: 90, pricePerPerson: 10, hours: "evening" },
  // Sin movie_theater: ir al cine es un plan de tu ciudad, no de un viaje de
  // cuatro días a Roma. En la primera carga coparon 14 de las 40 plazas de
  // vida nocturna (UCI Cinemas, Cinema Tibur...).

  // --- Naturaleza --------------------------------------------------------
  park: { profile: { nature: 2, relax: 1 }, durationMinutes: 60, pricePerPerson: 0, hours: "outdoor" },
  national_park: { profile: { nature: 3 }, durationMinutes: 180, pricePerPerson: 5, hours: "outdoor" },
  nature_reserve: { profile: { nature: 3 }, durationMinutes: 150, pricePerPerson: 4, hours: "outdoor" },
  // Los jardines pesan más en relax que en naturaleza a propósito: son el
  // sitio de descanso real de una ciudad, y sin ellos "relax" se quedaba
  // dependiendo de los balnearios, que en Overture son medio salón de belleza.
  garden: { profile: { relax: 3, nature: 2 }, durationMinutes: 60, pricePerPerson: 6, hours: "daytime" },
  mountain: { profile: { nature: 3 }, durationMinutes: 180, pricePerPerson: 0, hours: "outdoor" },
  lake: { profile: { nature: 2, relax: 1 }, durationMinutes: 90, pricePerPerson: 0, hours: "outdoor" },
  river: { profile: { nature: 1, relax: 1 }, durationMinutes: 45, pricePerPerson: 0, hours: "outdoor" },
  recreational_trail_or_path: { profile: { nature: 3 }, durationMinutes: 120, pricePerPerson: 0, hours: "outdoor" },
  bridge: { profile: { culture: 1, nature: 1 }, durationMinutes: 20, pricePerPerson: 0, hours: "always" },

  // --- Playa -------------------------------------------------------------
  beach: { profile: { beach: 3, relax: 1 }, durationMinutes: 150, pricePerPerson: 0, hours: "outdoor" },
  marina: { profile: { relax: 1, nature: 1 }, durationMinutes: 40, pricePerPerson: 0, hours: "outdoor" },
  pier: { profile: { relax: 1, beach: 1 }, durationMinutes: 30, pricePerPerson: 0, hours: "always" },

  // --- Familia -----------------------------------------------------------
  zoo: { profile: { family: 3, nature: 1 }, durationMinutes: 150, pricePerPerson: 20, hours: "museum" },
  aquarium: { profile: { family: 3, nature: 1 }, durationMinutes: 120, pricePerPerson: 20, hours: "museum" },
  amusement_park: { profile: { family: 3 }, durationMinutes: 240, pricePerPerson: 35, hours: "daytime" },
  amusement_attraction: { profile: { family: 2 }, durationMinutes: 90, pricePerPerson: 15, hours: "daytime" },
  // Sin playground ni arcade: un parque infantil de barrio no es un sitio al
  // que se viaje. Ocupaban 13 de las 40 plazas de "familia".

  // --- Relax -------------------------------------------------------------
  // wellness_service es donde Overture mete los balnearios, pero también
  // dietistas, centros de adelgazamiento y clínicas estéticas. Se queda con
  // un cupo bajo y filtrado por EXCLUDED_PRIMARIES; el grueso de "relax" son
  // los jardines. Aun así hay que contar con que se cuele algún centro de
  // estética: en Italia se etiquetan como "spa" en origen.
  wellness_service: { profile: { relax: 3 }, durationMinutes: 100, pricePerPerson: 40, hours: "daytime" },
  swimming_pool: { profile: { relax: 2, family: 1 }, durationMinutes: 90, pricePerPerson: 8, hours: "daytime" },

  // --- Compras y gastronomía --------------------------------------------
  // Sin restaurantes a propósito: en este paso los sitios donde se come
  // siguen siendo bloques abstractos del motor (ver schedule-itinerary.ts).
  // Lo que entra aquí son sitios que se VISITAN: mercados y bodegas.
  market: { profile: { shopping: 3, gastronomy: 1 }, durationMinutes: 60, pricePerPerson: 0, hours: "shop" },
  farmers_market: { profile: { gastronomy: 3, shopping: 2 }, durationMinutes: 60, pricePerPerson: 0, hours: "shop" },
  flea_market: { profile: { shopping: 3, culture: 1 }, durationMinutes: 60, pricePerPerson: 0, hours: "shop" },
  shopping_center: { profile: { shopping: 3 }, durationMinutes: 90, pricePerPerson: 0, hours: "shop" },
  department_store: { profile: { shopping: 2 }, durationMinutes: 60, pricePerPerson: 0, hours: "shop" },
  winery: { profile: { gastronomy: 3 }, durationMinutes: 90, pricePerPerson: 20, hours: "daytime" },
  brewery: { profile: { gastronomy: 3, nightlife: 1 }, durationMinutes: 90, pricePerPerson: 18, hours: "daytime" },
  distillery: { profile: { gastronomy: 3 }, durationMinutes: 90, pricePerPerson: 22, hours: "daytime" },
};

// Categorías finas (taxonomy.primary) que se descartan aunque su
// basic_category esté mapeada. Existe porque basic_category a veces mete en
// el mismo saco cosas muy distintas: `wellness_service` incluye balnearios
// (que sí son un plan de viaje) y nutricionistas o centros de adelgazamiento
// (que no). Salió de inspeccionar taxonomy.primary dentro de esa categoría.
export const EXCLUDED_PRIMARIES = [
  "nutrition_service",
  "weight_loss_center",
  "medical_spa",
  "health_coaching",
  "health_and_wellness_club",
];

// Ramas de nivel 0 que se inspeccionan. El resto (services_and_business,
// health_care, education, lodging...) no contiene actividades turísticas.
export const TOURIST_ROOTS = [
  "cultural_and_historic",
  "arts_and_entertainment",
  "sports_and_recreation",
  "geographic_entities",
  "shopping",
  "food_and_drink",
  "lifestyle_services",
];

const ALL_PREFERENCES: TravelPreference[] = [
  "beach",
  "culture",
  "gastronomy",
  "nightlife",
  "nature",
  "shopping",
  "family",
  "relax",
];

export function buildProfile(rule: CategoryRule): PreferenceProfile {
  const profile = {} as PreferenceProfile;
  for (const key of ALL_PREFERENCES) {
    profile[key] = rule.profile[key] ?? 0;
  }
  return profile;
}

// Preferencia dominante: la de mayor afinidad. Sirve para repartir el cupo
// por ciudad de forma equilibrada y para poder consultar "playas de Lisboa"
// sin tener que abrir el jsonb.
export function dominantPreference(rule: CategoryRule): TravelPreference {
  let best: TravelPreference = ALL_PREFERENCES[0];
  let bestLevel = -1;
  for (const key of ALL_PREFERENCES) {
    const level = rule.profile[key] ?? 0;
    if (level > bestLevel) {
      best = key;
      bestLevel = level;
    }
  }
  return best;
}

export function openingHoursFor(rule: CategoryRule): OpeningPeriod[] {
  return OPENING_PRESETS[rule.hours];
}
