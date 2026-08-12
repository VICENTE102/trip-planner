import type { ActivityCandidate, ActivitySearchRequest, OpeningPeriod } from "../types/activity.js";
import type { PreferenceLevel, PreferenceProfile, TravelPreference } from "../types/trip.js";
import { createSeededRandom, hashString, pick } from "../utils/random.js";
import { jitterCoordinates } from "../utils/geo.js";

interface ActivityTemplate {
  name: string;
  category: string;
  profile: Partial<Record<TravelPreference, PreferenceLevel>>;
  durationRange: [number, number];
  priceRange: [number, number];
}

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

// Cada plantilla puntúa fuerte en 1-2 preferencias y 0 en el resto, para que
// la selección por afinidad (sección 6.2, Fase 9) tenga datos coherentes
// con los que trabajar más adelante.
const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  { name: "Visita guiada al casco histórico", category: "cultura", profile: { culture: 3 }, durationRange: [90, 180], priceRange: [10, 30] },
  { name: "Entrada al museo principal", category: "cultura", profile: { culture: 3 }, durationRange: [60, 150], priceRange: [8, 25] },
  { name: "Recorrido gastronómico por el mercado", category: "gastronomia", profile: { gastronomy: 3, culture: 1 }, durationRange: [90, 150], priceRange: [20, 55] },
  { name: "Clase de cocina local", category: "gastronomia", profile: { gastronomy: 3 }, durationRange: [120, 210], priceRange: [35, 80] },
  { name: "Tarde de playa y deportes acuáticos", category: "playa", profile: { beach: 3, relax: 1 }, durationRange: [120, 240], priceRange: [0, 40] },
  { name: "Paseo en barco por la costa", category: "playa", profile: { beach: 2, nature: 1 }, durationRange: [90, 180], priceRange: [25, 60] },
  { name: "Ruta de senderismo por los alrededores", category: "naturaleza", profile: { nature: 3 }, durationRange: [150, 300], priceRange: [0, 20] },
  { name: "Visita a un parque natural", category: "naturaleza", profile: { nature: 3, relax: 1 }, durationRange: [120, 240], priceRange: [5, 25] },
  { name: "Noche de bares y música en vivo", category: "vida_nocturna", profile: { nightlife: 3 }, durationRange: [120, 240], priceRange: [15, 40] },
  { name: "Entrada a discoteca con ambiente nocturno", category: "vida_nocturna", profile: { nightlife: 3 }, durationRange: [180, 300], priceRange: [15, 45] },
  { name: "Tarde de compras en el centro comercial", category: "compras", profile: { shopping: 3 }, durationRange: [90, 180], priceRange: [0, 15] },
  { name: "Mercadillo de artesanía local", category: "compras", profile: { shopping: 2, culture: 1 }, durationRange: [60, 120], priceRange: [0, 15] },
  { name: "Parque temático para toda la familia", category: "familia", profile: { family: 3 }, durationRange: [180, 360], priceRange: [25, 55] },
  { name: "Zoo o acuario familiar", category: "familia", profile: { family: 3, nature: 1 }, durationRange: [120, 210], priceRange: [15, 35] },
  { name: "Spa y masaje relajante", category: "relax", profile: { relax: 3 }, durationRange: [60, 150], priceRange: [30, 90] },
  { name: "Mirador panorámico y tiempo libre", category: "relax", profile: { relax: 2, culture: 1 }, durationRange: [45, 90], priceRange: [0, 12] },
];

const MIN_ACTIVITIES = 20;
const MAX_ACTIVITIES = 30;

function buildProfile(overrides: Partial<Record<TravelPreference, PreferenceLevel>>): PreferenceProfile {
  const profile = {} as PreferenceProfile;
  for (const key of ALL_PREFERENCES) {
    profile[key] = overrides[key] ?? 0;
  }
  return profile;
}

function buildOpeningHours(random: () => number): OpeningPeriod[] {
  const opensAt = `${String(8 + Math.floor(random() * 3)).padStart(2, "0")}:00`;
  const closesAt = `${String(18 + Math.floor(random() * 4)).padStart(2, "0")}:00`;
  const openOnSunday = random() > 0.4;
  const days: OpeningPeriod["dayOfWeek"][] = openOnSunday ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];

  return days.map((dayOfWeek) => ({ dayOfWeek, opensAt, closesAt }));
}

// Garantiza al menos una instancia de cada plantilla (16 en total, 2 por
// cada una de las 8 temáticas/preferencias) antes de rellenar el resto de
// huecos con plantillas aleatorias para dar variedad. Con muestreo
// aleatorio puro, algunos destinos podían quedarse sin ninguna actividad
// de una categoría concreta (p. ej. "compras"), lo que rompe en la
// práctica la regla de la sección 6.1/Fase 9 de dar más peso a esa
// temática cuando el usuario la pide, aunque el ranking por afinidad en sí
// fuera correcto: no hay nada que ordenar arriba si no se generó ninguna
// actividad de esa categoría.
function buildTemplateSequence(count: number, seed: number): ActivityTemplate[] {
  const extraSlots = Math.max(0, count - ACTIVITY_TEMPLATES.length);
  const extras = Array.from({ length: extraSlots }, (_, index) => {
    const random = createSeededRandom(seed + 9973 + index);
    return pick(ACTIVITY_TEMPLATES, random);
  });
  return [...ACTIVITY_TEMPLATES, ...extras];
}

export function generateMockActivities(request: ActivitySearchRequest): ActivityCandidate[] {
  const seed = hashString(`activities-${request.destination}`);
  const countRandom = createSeededRandom(seed);
  const count = MIN_ACTIVITIES + Math.floor(countRandom() * (MAX_ACTIVITIES - MIN_ACTIVITIES + 1));
  const { center } = request;
  const templateSequence = buildTemplateSequence(count, seed);

  const activities: ActivityCandidate[] = [];
  for (let i = 0; i < templateSequence.length; i++) {
    const random = createSeededRandom(seed + i * 211 + 1);
    const template = templateSequence[i];
    const [minDuration, maxDuration] = template.durationRange;
    const [minPrice, maxPrice] = template.priceRange;
    const coordinates = jitterCoordinates(center, random, 0.15);

    activities.push({
      id: `activity-${seed}-${i}`,
      name: `${template.name} (${request.destination})`,
      category: template.category,
      profile: buildProfile(template.profile),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      rating: Math.round((3 + random() * 2) * 10) / 10,
      pricePerPerson: Math.round(minPrice + random() * (maxPrice - minPrice)),
      estimatedDurationMinutes: Math.round(minDuration + random() * (maxDuration - minDuration)),
      openingHours: buildOpeningHours(random),
      bookingRequired: random() > 0.6,
      // Dato simulado: nunca se marca "verified" sin una fuente externa real
      // (sección 15.2). Pasará a "verified"/"partial" cuando llegue Google
      // Places en fases posteriores.
      verificationStatus: "unverified",
    });
  }

  return activities;
}
