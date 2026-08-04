import type { Preference, Restaurant, TierLevel } from "../types";
import { pick } from "../utils/random";

interface TaggedOption {
  text: string;
  tags: Preference[];
}

function pickByPreference(pool: TaggedOption[], preferences: Preference[], random: () => number): string {
  const matching = pool.filter((option) => option.tags.some((tag) => preferences.includes(tag)));
  const generic = pool.filter((option) => option.tags.length === 0);
  const candidates = matching.length > 0 ? matching : generic.length > 0 ? generic : pool;
  return pick(candidates, random).text;
}

const MORNING_ACTIVITIES: Record<TierLevel, TaggedOption[]> = {
  barato: [
    { text: "Paseo gratuito por el casco histórico de {destination}", tags: ["Cultura"] },
    { text: "Mañana de playa pública en {destination}", tags: ["Playa"] },
    { text: "Ruta a pie por parques y miradores de {destination}", tags: ["Naturaleza"] },
    { text: "Visita al mercado local de {destination}", tags: ["Compras", "Gastronomía"] },
    { text: "Paseo tranquilo por el barrio antiguo", tags: ["Relax"] },
    { text: "Mañana en un parque infantil o plaza familiar", tags: ["Familia"] },
  ],
  medio: [
    { text: "Tour guiado por el centro histórico de {destination}", tags: ["Cultura"] },
    { text: "Mañana en una playa con chiringuito", tags: ["Playa"] },
    { text: "Excursión a pie a un mirador natural cercano", tags: ["Naturaleza"] },
    { text: "Ruta de compras por el distrito comercial", tags: ["Compras"] },
    { text: "Sesión de spa o yoga con vistas", tags: ["Relax"] },
    { text: "Visita a un museo interactivo apto para familias", tags: ["Familia"] },
    { text: "Clase de cocina local", tags: ["Gastronomía"] },
  ],
  caro: [
    { text: "Visita privada a un museo destacado de {destination}", tags: ["Cultura"] },
    { text: "Mañana en un beach club exclusivo", tags: ["Playa"] },
    { text: "Excursión guiada de naturaleza con guía privado", tags: ["Naturaleza"] },
    { text: "Personal shopper por las boutiques de lujo", tags: ["Compras"] },
    { text: "Spa premium con tratamiento a medida", tags: ["Relax"] },
    { text: "Actividad familiar VIP (parque temático o acuario premium)", tags: ["Familia"] },
    { text: "Desayuno maridado con productos locales", tags: ["Gastronomía"] },
  ],
};

const AFTERNOON_ACTIVITIES: Record<TierLevel, TaggedOption[]> = {
  barato: [
    { text: "Visita libre a un museo con entrada gratuita", tags: ["Cultura"] },
    { text: "Tarde de playa y baño", tags: ["Playa"] },
    { text: "Ruta en bici de alquiler económico por la ciudad", tags: ["Naturaleza"] },
    { text: "Recorrido por tiendas de segunda mano y mercadillos", tags: ["Compras"] },
    { text: "Tarde libre para descansar en el alojamiento", tags: ["Relax"] },
    { text: "Zona de juegos o parque para toda la familia", tags: ["Familia"] },
  ],
  medio: [
    { text: "Entrada a un museo o monumento emblemático", tags: ["Cultura"] },
    { text: "Paseo en barco por la costa", tags: ["Playa"] },
    { text: "Ruta de senderismo de dificultad media", tags: ["Naturaleza"] },
    { text: "Tarde de compras en el centro comercial principal", tags: ["Compras"] },
    { text: "Tarde de spa o piscina", tags: ["Relax"] },
    { text: "Visita a un acuario o zoo", tags: ["Familia"] },
    { text: "Cata de productos locales", tags: ["Gastronomía"] },
  ],
  caro: [
    { text: "Visita privada con guía experto a un lugar icónico", tags: ["Cultura"] },
    { text: "Alquiler de catamarán o yate por la tarde", tags: ["Playa"] },
    { text: "Excursión en helicóptero o 4x4 por parajes naturales", tags: ["Naturaleza"] },
    { text: "Tarde de compras en boutiques exclusivas", tags: ["Compras"] },
    { text: "Circuito spa de lujo con masaje incluido", tags: ["Relax"] },
    { text: "Experiencia familiar exclusiva (visita guiada privada)", tags: ["Familia"] },
    { text: "Tour gastronómico con chef local", tags: ["Gastronomía"] },
  ],
};

const NIGHT_ACTIVITIES: Record<TierLevel, TaggedOption[]> = {
  barato: [
    { text: "Zona de bares económicos y música en vivo", tags: ["Vida nocturna"] },
    { text: "Paseo nocturno tranquilo junto al mar o el río", tags: ["Relax"] },
    { text: "Noche de juegos en familia en el alojamiento", tags: ["Familia"] },
    { text: "Cena informal y paseo por el centro", tags: [] },
  ],
  medio: [
    { text: "Copas en una terraza con ambiente local", tags: ["Vida nocturna"] },
    { text: "Paseo nocturno con vistas iluminadas de la ciudad", tags: ["Relax"] },
    { text: "Espectáculo o show apto para toda la familia", tags: ["Familia"] },
    { text: "Cena y paseo por la zona más animada", tags: [] },
  ],
  caro: [
    { text: "Rooftop bar con vistas panorámicas", tags: ["Vida nocturna"] },
    { text: "Cena tranquila con música en directo", tags: ["Relax"] },
    { text: "Espectáculo premium en familia", tags: ["Familia"] },
    { text: "Cena de autor y paseo por el distrito más exclusivo", tags: [] },
  ],
};

const RESTAURANT_NAME_PARTS: Record<TierLevel, { prefixes: string[]; suffixes: string[] }> = {
  barato: {
    prefixes: ["Bar", "Taberna", "Puesto", "Cantina"],
    suffixes: ["del Mercado", "de la Esquina", "El Rápido", "La Parada"],
  },
  medio: {
    prefixes: ["Restaurante", "Bistró", "Casa", "Rincón"],
    suffixes: ["del Puerto", "de la Plaza", "El Local", "La Terraza"],
  },
  caro: {
    prefixes: ["Restaurante", "Casa", "Atelier", "Club"],
    suffixes: ["Gourmet", "de Autor", "El Mirador", "La Boutique"],
  },
};

const RESTAURANT_AREAS = [
  "Casco antiguo",
  "Paseo marítimo",
  "Barrio bohemio",
  "Distrito financiero",
  "Zona del mercado",
  "Centro histórico",
];

const RESTAURANT_DESCRIPTIONS: Record<TierLevel, string[]> = {
  barato: [
    "Comida casera a buen precio, ideal para probar sabores locales sin gastar mucho.",
    "Menú del día sencillo y abundante, muy popular entre locales.",
    "Puesto informal con las especialidades típicas de la zona.",
  ],
  medio: [
    "Cocina local con buena relación calidad-precio y ambiente agradable.",
    "Platos de temporada elaborados con producto fresco de la zona.",
    "Ambiente cuidado, ideal para una comida sin prisas.",
  ],
  caro: [
    "Propuesta gastronómica de autor con productos de primera calidad.",
    "Experiencia culinaria destacada, ideal para una ocasión especial.",
    "Cocina de alta gama con presentación cuidada y servicio exclusivo.",
  ],
};

export function pickMorningActivity(
  destination: string,
  tier: TierLevel,
  preferences: Preference[],
  random: () => number,
): string {
  return pickByPreference(MORNING_ACTIVITIES[tier], preferences, random).replace(
    "{destination}",
    destination,
  );
}

export function pickAfternoonActivity(
  destination: string,
  tier: TierLevel,
  preferences: Preference[],
  random: () => number,
): string {
  return pickByPreference(AFTERNOON_ACTIVITIES[tier], preferences, random).replace(
    "{destination}",
    destination,
  );
}

export function pickNightActivity(
  tier: TierLevel,
  preferences: Preference[],
  random: () => number,
): string {
  return pickByPreference(NIGHT_ACTIVITIES[tier], preferences, random);
}

export function buildRestaurant(tier: TierLevel, random: () => number): Restaurant {
  const { prefixes, suffixes } = RESTAURANT_NAME_PARTS[tier];
  return {
    name: `${pick(prefixes, random)} ${pick(suffixes, random)}`,
    description: pick(RESTAURANT_DESCRIPTIONS[tier], random),
    area: pick(RESTAURANT_AREAS, random),
  };
}
