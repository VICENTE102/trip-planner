import type { Preference, Restaurant, TierLevel } from "../types";
import { pick } from "../utils/random";

interface TaggedOption {
  // Tema al que pertenece la variante: mapea a una foto curada en
  // constants/blockImages.ts (varias variantes comparten el mismo id/tema,
  // así se reutiliza la misma imagen en vez de necesitar una por frase).
  id: string;
  text: string;
  tags: Preference[];
}

function pickByPreference(
  pool: TaggedOption[],
  preferences: Preference[],
  random: () => number,
  excludeText?: string,
): TaggedOption {
  const matching = pool.filter((option) => option.tags.some((tag) => preferences.includes(tag)));
  const candidates = matching.length > 0 ? matching : pool;
  // No repetir el mismo texto que el día anterior en este bloque, salvo
  // que no quede ninguna otra opción posible (p. ej. viaje muy largo con
  // pocas variantes disponibles para esa preferencia).
  const withoutRepeat = excludeText ? candidates.filter((option) => option.text !== excludeText) : candidates;
  const finalCandidates = withoutRepeat.length > 0 ? withoutRepeat : candidates;
  return pick(finalCandidates, random);
}

// `id` mapea a una miniatura fija en constants/blockImages.ts. Mañana y
// tarde reutilizan el mismo pequeño conjunto de ids (por tema, no por
// nivel ni por variante) para no necesitar más que un puñado de fotos
// curadas.
const MORNING_ACTIVITIES: Record<TierLevel, TaggedOption[]> = {
  barato: [
    { id: "cultura", text: "Paseo gratuito por el casco histórico de {destination}", tags: ["Cultura"] },
    { id: "cultura", text: "Ruta autoguiada por los monumentos más emblemáticos de {destination}", tags: ["Cultura"] },
    { id: "cultura", text: "Visita a una iglesia o plaza histórica con entrada libre", tags: ["Cultura"] },
    { id: "playa", text: "Mañana de playa pública en {destination}", tags: ["Playa"] },
    { id: "playa", text: "Paseo por el paseo marítimo y primer baño del día", tags: ["Playa"] },
    { id: "playa", text: "Cala tranquila de acceso gratuito para empezar el día", tags: ["Playa"] },
    { id: "naturaleza", text: "Ruta a pie por parques y miradores de {destination}", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Paseo matinal por un parque urbano o jardín botánico", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Sendero corto y accesible en los alrededores", tags: ["Naturaleza"] },
    { id: "compras", text: "Visita al mercado local de {destination}", tags: ["Compras", "Gastronomía"] },
    { id: "compras", text: "Paseo por el mercadillo de productos de la zona", tags: ["Compras"] },
    { id: "compras", text: "Recorrido por las calles comerciales del centro", tags: ["Compras"] },
    { id: "relax", text: "Paseo tranquilo por el barrio antiguo", tags: ["Relax"] },
    { id: "relax", text: "Mañana sin prisas con café en una plaza tranquila", tags: ["Relax"] },
    { id: "relax", text: "Rato de lectura y descanso en un parque cercano", tags: ["Relax"] },
    { id: "familia", text: "Mañana en un parque infantil o plaza familiar", tags: ["Familia"] },
    { id: "familia", text: "Visita a una plaza o parque con zona de juegos", tags: ["Familia"] },
    { id: "familia", text: "Paseo familiar por una zona peatonal tranquila", tags: ["Familia"] },
    { id: "gastronomia", text: "Desayuno típico en un puesto local", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Visita a una panadería o mercado de productos frescos", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Ruta de degustación económica por el barrio", tags: ["Gastronomía"] },
  ],
  medio: [
    { id: "cultura", text: "Tour guiado por el centro histórico de {destination}", tags: ["Cultura"] },
    { id: "cultura", text: "Visita a un museo o monumento destacado", tags: ["Cultura"] },
    { id: "cultura", text: "Recorrido cultural por los barrios con más patrimonio", tags: ["Cultura"] },
    { id: "playa", text: "Mañana en una playa con chiringuito", tags: ["Playa"] },
    { id: "playa", text: "Sesión de kayak o paddle surf en la costa", tags: ["Playa"] },
    { id: "playa", text: "Playa tranquila con hamacas y sombrillas de alquiler", tags: ["Playa"] },
    { id: "naturaleza", text: "Excursión a pie a un mirador natural cercano", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Ruta en bicicleta por parajes naturales", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Visita a un parque natural cercano a la ciudad", tags: ["Naturaleza"] },
    { id: "compras", text: "Ruta de compras por el distrito comercial", tags: ["Compras"] },
    { id: "compras", text: "Mercado de diseño y artesanía local", tags: ["Compras"] },
    { id: "compras", text: "Mañana en las tiendas del centro", tags: ["Compras"] },
    { id: "relax", text: "Sesión de spa o yoga con vistas", tags: ["Relax"] },
    { id: "relax", text: "Mañana de piscina y tranquilidad en el alojamiento", tags: ["Relax"] },
    { id: "relax", text: "Paseo relajado con parada en una terraza tranquila", tags: ["Relax"] },
    { id: "familia", text: "Visita a un museo interactivo apto para familias", tags: ["Familia"] },
    { id: "familia", text: "Mañana en un parque temático o zoo pequeño", tags: ["Familia"] },
    { id: "familia", text: "Actividad familiar en un centro de ocio local", tags: ["Familia"] },
    { id: "gastronomia", text: "Clase de cocina local", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Visita guiada a un mercado gastronómico", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Desayuno con productos típicos de la región", tags: ["Gastronomía"] },
  ],
  caro: [
    { id: "cultura", text: "Visita privada a un museo destacado de {destination}", tags: ["Cultura"] },
    { id: "cultura", text: "Tour cultural exclusivo con guía experto", tags: ["Cultura"] },
    { id: "cultura", text: "Acceso VIP a un monumento emblemático sin colas", tags: ["Cultura"] },
    { id: "playa", text: "Mañana en un beach club exclusivo", tags: ["Playa"] },
    { id: "playa", text: "Excursión en barco privado por la costa", tags: ["Playa"] },
    { id: "playa", text: "Playa privada con servicio de mayordomo", tags: ["Playa"] },
    { id: "naturaleza", text: "Excursión guiada de naturaleza con guía privado", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Ruta en helicóptero por parajes naturales", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Experiencia de naturaleza premium con transporte incluido", tags: ["Naturaleza"] },
    { id: "compras", text: "Personal shopper por las boutiques de lujo", tags: ["Compras"] },
    { id: "compras", text: "Mañana de compras en el distrito de alta gama", tags: ["Compras"] },
    { id: "compras", text: "Visita privada a talleres de artesanía de lujo", tags: ["Compras"] },
    { id: "relax", text: "Spa premium con tratamiento a medida", tags: ["Relax"] },
    { id: "relax", text: "Mañana de bienestar en un spa de cinco estrellas", tags: ["Relax"] },
    { id: "relax", text: "Sesión privada de yoga o meditación con vistas", tags: ["Relax"] },
    { id: "familia", text: "Actividad familiar VIP (parque temático o acuario premium)", tags: ["Familia"] },
    { id: "familia", text: "Experiencia familiar exclusiva con guía privado", tags: ["Familia"] },
    { id: "familia", text: "Mañana en un parque temático de primer nivel", tags: ["Familia"] },
    { id: "gastronomia", text: "Desayuno maridado con productos locales", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Clase de cocina privada con chef local", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Visita a una bodega o productor gourmet exclusivo", tags: ["Gastronomía"] },
  ],
};

const AFTERNOON_ACTIVITIES: Record<TierLevel, TaggedOption[]> = {
  barato: [
    { id: "cultura", text: "Visita libre a un museo con entrada gratuita", tags: ["Cultura"] },
    { id: "cultura", text: "Recorrido a pie por los barrios con más historia", tags: ["Cultura"] },
    { id: "cultura", text: "Tarde en una plaza o mirador con encanto", tags: ["Cultura"] },
    { id: "playa", text: "Tarde de playa y baño", tags: ["Playa"] },
    { id: "playa", text: "Tarde relajada en la arena con vistas al mar", tags: ["Playa"] },
    { id: "playa", text: "Paseo por calas cercanas de acceso libre", tags: ["Playa"] },
    { id: "naturaleza", text: "Ruta en bici de alquiler económico por la ciudad", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Paseo por senderos naturales cercanos", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Tarde en un parque grande con zonas verdes", tags: ["Naturaleza"] },
    { id: "compras", text: "Recorrido por tiendas de segunda mano y mercadillos", tags: ["Compras"] },
    { id: "compras", text: "Tarde en el mercadillo semanal", tags: ["Compras"] },
    { id: "compras", text: "Paseo por calles con tiendas locales", tags: ["Compras"] },
    { id: "relax", text: "Tarde libre para descansar en el alojamiento", tags: ["Relax"] },
    { id: "relax", text: "Tarde tranquila en una terraza o parque", tags: ["Relax"] },
    { id: "relax", text: "Siesta y tiempo libre sin planes", tags: ["Relax"] },
    { id: "familia", text: "Zona de juegos o parque para toda la familia", tags: ["Familia"] },
    { id: "familia", text: "Tarde en una plaza con animación infantil", tags: ["Familia"] },
    { id: "familia", text: "Paseo familiar por el centro", tags: ["Familia"] },
    { id: "gastronomia", text: "Merienda típica en un puesto local", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Ruta de tapas económicas", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Visita a una heladería o pastelería tradicional", tags: ["Gastronomía"] },
  ],
  medio: [
    { id: "cultura", text: "Entrada a un museo o monumento emblemático", tags: ["Cultura"] },
    { id: "cultura", text: "Visita guiada a un barrio histórico", tags: ["Cultura"] },
    { id: "cultura", text: "Tarde cultural con exposición temporal", tags: ["Cultura"] },
    { id: "playa", text: "Paseo en barco por la costa", tags: ["Playa"] },
    { id: "playa", text: "Tarde de sol y baño en una playa concurrida", tags: ["Playa"] },
    { id: "playa", text: "Actividad acuática ligera (paddle, snorkel...)", tags: ["Playa"] },
    { id: "naturaleza", text: "Ruta de senderismo de dificultad media", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Tarde en bicicleta por la costa o el campo", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Visita a un mirador natural con paseo incluido", tags: ["Naturaleza"] },
    { id: "compras", text: "Tarde de compras en el centro comercial principal", tags: ["Compras"] },
    { id: "compras", text: "Recorrido por tiendas de diseño local", tags: ["Compras"] },
    { id: "compras", text: "Mercado de artesanía y productos de autor", tags: ["Compras"] },
    { id: "relax", text: "Tarde de spa o piscina", tags: ["Relax"] },
    { id: "relax", text: "Sesión de masaje o wellness", tags: ["Relax"] },
    { id: "relax", text: "Tarde tranquila con paseo panorámico", tags: ["Relax"] },
    { id: "familia", text: "Visita a un acuario o zoo", tags: ["Familia"] },
    { id: "familia", text: "Tarde en un parque de atracciones familiar", tags: ["Familia"] },
    { id: "familia", text: "Actividad familiar en un centro de ocio", tags: ["Familia"] },
    { id: "gastronomia", text: "Cata de productos locales", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Ruta de tapas por el centro", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Taller de repostería o productos típicos", tags: ["Gastronomía"] },
  ],
  caro: [
    { id: "cultura", text: "Visita privada con guía experto a un lugar icónico", tags: ["Cultura"] },
    { id: "cultura", text: "Tarde cultural exclusiva con acceso preferente", tags: ["Cultura"] },
    { id: "cultura", text: "Recorrido histórico en vehículo clásico", tags: ["Cultura"] },
    { id: "playa", text: "Alquiler de catamarán o yate por la tarde", tags: ["Playa"] },
    { id: "playa", text: "Tarde en un club de playa de lujo", tags: ["Playa"] },
    { id: "playa", text: "Excursión privada en velero", tags: ["Playa"] },
    { id: "naturaleza", text: "Excursión en helicóptero o 4x4 por parajes naturales", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Ruta privada de naturaleza con guía experto", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Tarde en una reserva natural exclusiva", tags: ["Naturaleza"] },
    { id: "compras", text: "Tarde de compras en boutiques exclusivas", tags: ["Compras"] },
    { id: "compras", text: "Personal shopper por el distrito de lujo", tags: ["Compras"] },
    { id: "compras", text: "Visita privada a una casa de diseño local", tags: ["Compras"] },
    { id: "relax", text: "Circuito spa de lujo con masaje incluido", tags: ["Relax"] },
    { id: "relax", text: "Tarde de bienestar en un spa premium", tags: ["Relax"] },
    { id: "relax", text: "Sesión privada de relax con vistas panorámicas", tags: ["Relax"] },
    { id: "familia", text: "Experiencia familiar exclusiva (visita guiada privada)", tags: ["Familia"] },
    { id: "familia", text: "Tarde VIP en un parque temático", tags: ["Familia"] },
    { id: "familia", text: "Actividad familiar de lujo con transporte privado", tags: ["Familia"] },
    { id: "gastronomia", text: "Tour gastronómico con chef local", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Cata de vinos exclusiva con maridaje", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Visita privada a un restaurante con estrella", tags: ["Gastronomía"] },
  ],
};

const NIGHT_ACTIVITIES: Record<TierLevel, TaggedOption[]> = {
  barato: [
    { id: "vida-nocturna", text: "Zona de bares económicos y música en vivo", tags: ["Vida nocturna"] },
    { id: "vida-nocturna", text: "Ruta de bares locales con precios populares", tags: ["Vida nocturna"] },
    { id: "vida-nocturna", text: "Noche de karaoke o música en directo sencilla", tags: ["Vida nocturna"] },
    { id: "cultura", text: "Paseo nocturno por el casco histórico iluminado", tags: ["Cultura"] },
    { id: "cultura", text: "Recorrido a pie por plazas y monumentos de noche", tags: ["Cultura"] },
    { id: "cultura", text: "Noche de cine de verano o proyección al aire libre", tags: ["Cultura"] },
    { id: "gastronomia", text: "Cena informal en un puesto callejero", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Ruta económica de tapas nocturnas", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Mercado nocturno de comida callejera", tags: ["Gastronomía"] },
    { id: "playa", text: "Paseo nocturno por el paseo marítimo", tags: ["Playa"] },
    { id: "playa", text: "Noche tranquila junto al mar", tags: ["Playa"] },
    { id: "playa", text: "Cena sencilla frente a la playa", tags: ["Playa"] },
    { id: "naturaleza", text: "Paseo nocturno por un parque cercano", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Observación de estrellas en una zona sin luces", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Noche tranquila al aire libre en un mirador", tags: ["Naturaleza"] },
    { id: "compras", text: "Paseo por un mercadillo nocturno", tags: ["Compras"] },
    { id: "compras", text: "Recorrido por una calle comercial con horario nocturno", tags: ["Compras"] },
    { id: "compras", text: "Noche de compras en tiendas económicas abiertas hasta tarde", tags: ["Compras"] },
    { id: "familia", text: "Noche de juegos en familia en el alojamiento", tags: ["Familia"] },
    { id: "familia", text: "Paseo familiar por una plaza con ambiente", tags: ["Familia"] },
    { id: "familia", text: "Sesión de cine o juegos de mesa en el alojamiento", tags: ["Familia"] },
    { id: "relax", text: "Paseo nocturno tranquilo junto al mar o el río", tags: ["Relax"] },
    { id: "relax", text: "Noche relajada con cena ligera", tags: ["Relax"] },
    { id: "relax", text: "Rato de lectura o descanso tras la cena", tags: ["Relax"] },
  ],
  medio: [
    { id: "vida-nocturna", text: "Copas en una terraza con ambiente local", tags: ["Vida nocturna"] },
    { id: "vida-nocturna", text: "Bar de cócteles con música en directo", tags: ["Vida nocturna"] },
    { id: "vida-nocturna", text: "Noche de ambiente en una zona con marcha", tags: ["Vida nocturna"] },
    { id: "cultura", text: "Recorrido nocturno por el casco histórico iluminado de {destination}", tags: ["Cultura"] },
    { id: "cultura", text: "Espectáculo tradicional (flamenco, folclore local...)", tags: ["Cultura"] },
    { id: "cultura", text: "Visita a una exposición o museo con horario nocturno", tags: ["Cultura"] },
    { id: "gastronomia", text: "Ruta de tapas y vinos por bares locales", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Cena con showcooking en vivo", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Mercado gastronómico nocturno", tags: ["Gastronomía"] },
    { id: "playa", text: "Copa junto al mar al atardecer", tags: ["Playa"] },
    { id: "playa", text: "Cena frente al mar con música en vivo", tags: ["Playa"] },
    { id: "playa", text: "Paseo nocturno por el paseo marítimo con parada en un chiringuito", tags: ["Playa"] },
    { id: "naturaleza", text: "Sesión de observación de estrellas guiada", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Paseo nocturno por un parque natural cercano", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Cena al aire libre con vistas panorámicas", tags: ["Naturaleza"] },
    { id: "compras", text: "Mercado nocturno de artesanía y diseño", tags: ["Compras"] },
    { id: "compras", text: "Paseo por el distrito comercial con horario extendido", tags: ["Compras"] },
    { id: "compras", text: "Noche de compras en el centro con ambiente animado", tags: ["Compras"] },
    { id: "familia", text: "Espectáculo o show apto para toda la familia", tags: ["Familia"] },
    { id: "familia", text: "Sesión de cine al aire libre", tags: ["Familia"] },
    { id: "familia", text: "Paseo familiar con heladería y ambiente nocturno", tags: ["Familia"] },
    { id: "relax", text: "Paseo nocturno con vistas iluminadas de la ciudad", tags: ["Relax"] },
    { id: "relax", text: "Cena tranquila con música en directo", tags: ["Relax"] },
    { id: "relax", text: "Tarde-noche de relax con vistas panorámicas", tags: ["Relax"] },
  ],
  caro: [
    { id: "vida-nocturna", text: "Rooftop bar con vistas panorámicas", tags: ["Vida nocturna"] },
    { id: "vida-nocturna", text: "Discoteca o club exclusivo con acceso VIP", tags: ["Vida nocturna"] },
    { id: "vida-nocturna", text: "Noche de copas en un lounge de diseño", tags: ["Vida nocturna"] },
    { id: "cultura", text: "Espectáculo cultural exclusivo (ópera, teatro...)", tags: ["Cultura"] },
    { id: "cultura", text: "Visita privada nocturna a un monumento icónico", tags: ["Cultura"] },
    { id: "cultura", text: "Cena-espectáculo con actuación en vivo", tags: ["Cultura"] },
    { id: "gastronomia", text: "Cena de autor y paseo por el distrito más exclusivo", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Experiencia gastronómica con menú degustación", tags: ["Gastronomía"] },
    { id: "gastronomia", text: "Cata de vinos premium con maridaje nocturno", tags: ["Gastronomía"] },
    { id: "playa", text: "Cena exclusiva junto al mar", tags: ["Playa"] },
    { id: "playa", text: "Fiesta en un beach club de lujo", tags: ["Playa"] },
    { id: "playa", text: "Paseo privado por la costa al atardecer", tags: ["Playa"] },
    { id: "naturaleza", text: "Cena bajo las estrellas en un entorno natural", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Observación astronómica privada con guía experto", tags: ["Naturaleza"] },
    { id: "naturaleza", text: "Experiencia nocturna exclusiva en plena naturaleza", tags: ["Naturaleza"] },
    { id: "compras", text: "Noche de compras privadas en boutiques exclusivas", tags: ["Compras"] },
    { id: "compras", text: "Visita VIP a un distrito de lujo con horario especial", tags: ["Compras"] },
    { id: "compras", text: "Experiencia de personal shopper nocturna", tags: ["Compras"] },
    { id: "familia", text: "Espectáculo premium en familia", tags: ["Familia"] },
    { id: "familia", text: "Experiencia familiar exclusiva nocturna", tags: ["Familia"] },
    { id: "familia", text: "Cena-espectáculo apta para toda la familia", tags: ["Familia"] },
    { id: "relax", text: "Cena tranquila con música en directo", tags: ["Relax"] },
    { id: "relax", text: "Noche de spa y relax premium", tags: ["Relax"] },
    { id: "relax", text: "Velada exclusiva con vistas panorámicas", tags: ["Relax"] },
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

export interface PickedActivity {
  id: string;
  text: string;
}

export function pickMorningActivity(
  destination: string,
  tier: TierLevel,
  preferences: Preference[],
  random: () => number,
  excludeText?: string,
): PickedActivity {
  const option = pickByPreference(MORNING_ACTIVITIES[tier], preferences, random, excludeText);
  return { id: option.id, text: option.text.replace("{destination}", destination) };
}

export function pickAfternoonActivity(
  destination: string,
  tier: TierLevel,
  preferences: Preference[],
  random: () => number,
  excludeText?: string,
): PickedActivity {
  const option = pickByPreference(AFTERNOON_ACTIVITIES[tier], preferences, random, excludeText);
  return { id: option.id, text: option.text.replace("{destination}", destination) };
}

export function pickNightActivity(
  destination: string,
  tier: TierLevel,
  preferences: Preference[],
  random: () => number,
  excludeText?: string,
): string {
  const option = pickByPreference(NIGHT_ACTIVITIES[tier], preferences, random, excludeText);
  return option.text.replace("{destination}", destination);
}

export function buildRestaurant(tier: TierLevel, random: () => number): Restaurant {
  const { prefixes, suffixes } = RESTAURANT_NAME_PARTS[tier];
  return {
    name: `${pick(prefixes, random)} ${pick(suffixes, random)}`,
    description: pick(RESTAURANT_DESCRIPTIONS[tier], random),
    area: pick(RESTAURANT_AREAS, random),
    tier,
  };
}
