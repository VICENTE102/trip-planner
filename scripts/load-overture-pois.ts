import { DuckDBInstance } from "@duckdb/node-api";
import { createClient } from "@supabase/supabase-js";
import {
  CATEGORY_RULES,
  EXCLUDED_PRIMARIES,
  TOURIST_ROOTS,
  buildProfile,
  dominantPreference,
  openingHoursFor,
} from "./overture-categories.ts";
import { DESTINATIONS, type DestinationSeed } from "./destinations.ts";

// Cargador offline de puntos de interés de Overture Maps.
//
// Overture NO es una API en vivo: se publica como GeoParquet en S3 y se
// consulta con DuckDB filtrando por bounding box, que es lo que hace que solo
// se transfiera la zona que interesa en vez de un dataset mundial. Por eso
// esto se ejecuta a mano desde tu máquina y no desde Vercel; en producción la
// tabla `places` solo se lee.
//
// Este script es deliberadamente autónomo: no importa nada de server/. Node
// ejecuta TypeScript quitando los tipos, pero no resuelve los especificadores
// ".js" que usa el backend (obligatorios para Vercel), así que importar
// geocoding.service.ts desde aquí no arrancaría. Duplica por eso la llamada a
// Geoapify y el cliente de Supabase, unas pocas líneas cada uno.
//
//   npm run pois:inspect          qué categorías hay y cuáles no mapeamos
//   npm run pois:load             carga los destinos que falten
//   npm run pois:load -- --force  recarga también los ya cargados
//   npm run pois:load -- --only=Roma

const RELEASE = "2026-07-22.0";
const SRC = `s3://overturemaps-us-west-2/release/${RELEASE}/theme=places/type=place/*`;

// Overture puntúa cada sitio con la probabilidad de que exista de verdad.
// Por debajo de esto entra demasiado ruido y sitios ya cerrados.
const MIN_CONFIDENCE = 0.6;
// Tope por preferencia y ciudad: el motor elige unas pocas actividades por
// viaje, así que guardar miles por ciudad solo engordaría la tabla. Con 40
// por preferencia hay variedad de sobra y la ciudad entra en ~320 filas.
const MAX_PER_PREFERENCE = 40;
// Tope por categoría dentro de cada preferencia. Sin esto una sola categoría
// se come la preferencia entera: en la primera carga de Roma, 39 de los 40
// sitios de "naturaleza" eran `park` y 31 de los 40 de "compras" eran grandes
// almacenes. El objetivo de la lista es que el motor tenga variedad real que
// puntuar, no 40 veces lo mismo.
const MAX_PER_CATEGORY = 12;
const INSERT_BATCH = 500;
// Debe coincidir con CACHE_TTL_DAYS.placesStale (server/config/cache-policy.ts).
// Está repetido porque este script es autónomo a propósito y no importa nada
// de server/; son 90 días y un comentario, no merece un módulo compartido.
const STALE_AFTER_DAYS = 90;

// Destinos que ya están cargados pero llevan demasiado tiempo sin refrescarse.
// Se acumulan para poder resumirlos al final, en vez de que el aviso se pierda
// entre veinte líneas de salida.
const stale: { name: string; days: number; count: number }[] = [];

const args = process.argv.slice(2);
const INSPECT = args.includes("--inspect");
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);

function normalizeCityName(value: string): string {
  return value.split(",")[0].trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Para deduplicar nombres de sitios, no de ciudades: aquí no se puede cortar
// por la coma (hay locales que la llevan en el nombre) ni conviene distinguir
// por espacios de más.
function normalizeName(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`Falta ${name}. Ejecuta con: node --env-file=.env.local (npm run pois:load ya lo hace).`);
    process.exit(1);
  }
  return value.trim();
}

const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const geoapifyKey = requireEnv("GEOAPIFY_API_KEY");

interface Box {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

async function geocode(name: string): Promise<{ lat: number; lng: number }> {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  // Normalizado, igual que geocoding.service.ts: Geoapify resuelve
  // "Ámsterdam" como Nueva York y "amsterdam" como Países Bajos.
  url.searchParams.set("text", normalizeCityName(name));
  url.searchParams.set("type", "city");
  url.searchParams.set("lang", "es");
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", geoapifyKey);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geoapify ${response.status} para "${name}"`);
  const first = ((await response.json()) as { results?: { lat?: number; lon?: number }[] }).results?.[0];
  if (typeof first?.lat !== "number" || typeof first?.lon !== "number") {
    throw new Error(`Geoapify no encontró "${name}"`);
  }
  return { lat: first.lat, lng: first.lon };
}

// Caja alrededor del centro. Un grado de latitud son ~111,32 km en cualquier
// sitio; uno de longitud se estrecha con el coseno de la latitud, y por eso
// una caja "cuadrada" en grados sería rectangular en km al norte de Europa.
function boxAround(center: { lat: number; lng: number }, radiusKm: number): Box {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  return {
    xmin: center.lng - dLng,
    xmax: center.lng + dLng,
    ymin: center.lat - dLat,
    ymax: center.lat + dLat,
  };
}

const instance = await DuckDBInstance.create(":memory:");
const duck = await instance.connect();
await duck.run("INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';");

const FROM = `read_parquet('${SRC}', hive_partitioning=1)`;
const boxFilter = (b: Box) =>
  `bbox.xmin BETWEEN ${b.xmin} AND ${b.xmax} AND bbox.ymin BETWEEN ${b.ymin} AND ${b.ymax}`;

async function query(sql: string): Promise<Record<string, unknown>[]> {
  return (await duck.runAndReadAll(sql)).getRowObjects() as Record<string, unknown>[];
}

const quoted = (values: string[]) => values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

// --- modo inspección -------------------------------------------------------
// Enseña qué categorías turísticas tiene una ciudad y cuáles NO están en
// CATEGORY_RULES. Es la forma de ampliar el mapa sin adivinar nombres: las
// categorías de Overture no están completas en su documentación.
async function inspect(destination: DestinationSeed): Promise<void> {
  const center = await geocode(destination.name);
  const box = boxAround(center, destination.radiusKm);
  console.log(`\n=== ${destination.name} (${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}) ===`);

  const rows = await query(`
    SELECT basic_category AS basic, taxonomy.hierarchy[1] AS root, count(*) AS n
    FROM ${FROM}
    WHERE ${boxFilter(box)}
      AND names.primary IS NOT NULL AND basic_category IS NOT NULL
      AND confidence >= ${MIN_CONFIDENCE}
      AND operating_status IS DISTINCT FROM 'permanently_closed'
      AND taxonomy.hierarchy[1] IN (${quoted(TOURIST_ROOTS)})
    GROUP BY 1, 2 ORDER BY n DESC`);

  const mapped = rows.filter((r) => CATEGORY_RULES[String(r.basic)]);
  const unmapped = rows.filter((r) => !CATEGORY_RULES[String(r.basic)]);
  const total = (list: typeof rows) => list.reduce((sum, r) => sum + Number(r.n), 0);

  console.log(`mapeadas:   ${mapped.length} categorías, ${total(mapped)} sitios`);
  console.log(`SIN mapear: ${unmapped.length} categorías, ${total(unmapped)} sitios`);
  console.log("\nTop 25 sin mapear (candidatas a añadir a CATEGORY_RULES):");
  for (const r of unmapped.slice(0, 25)) {
    console.log(String(r.n).padStart(6), `${r.root} > ${r.basic}`);
  }
}

// --- modo carga ------------------------------------------------------------
interface PlaceRow {
  id: string;
  destination_key: string;
  name: string;
  latitude: number;
  longitude: number;
  basic_category: string;
  overture_primary: string | null;
  overture_hierarchy: string[] | null;
  preference: string;
  profile: Record<string, number>;
  duration_minutes: number;
  price_per_person: number;
  opening_hours: unknown;
  confidence: number | null;
  website: string | null;
  overture_release: string;
}

async function load(destination: DestinationSeed): Promise<void> {
  const key = normalizeCityName(destination.name);

  if (!FORCE) {
    const { count } = await supabase
      .from("places")
      .select("id", { count: "exact", head: true })
      .eq("destination_key", key);

    if ((count ?? 0) > 0) {
      // Paso 9: la caducidad de `places` es un AVISO, no una expulsión.
      //
      // Es la diferencia importante con las otras dos cachés. Si un sitio
      // caducado se ignorase al leerlo, el destino se quedaría sin lugares
      // reales y el itinerario volvería a inventárselos con el mock, en
      // silencio y de un día para otro. Overture no es una API en vivo: nadie
      // repone esa fila salvo este script, ejecutado a mano. Así que lo único
      // sensato es decirlo aquí, que es donde alguien puede actuar.
      const { data: masAntiguo } = await supabase
        .from("places")
        .select("loaded_at")
        .eq("destination_key", key)
        .order("loaded_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const dias = masAntiguo?.loaded_at
        ? Math.floor((Date.now() - Date.parse(masAntiguo.loaded_at)) / 86_400_000)
        : undefined;

      if (dias !== undefined && dias > STALE_AFTER_DAYS) {
        stale.push({ name: destination.name, days: dias, count: count ?? 0 });
        console.log(
          `- ${destination.name}: ${count} sitios cargados hace ${dias} días, CONVIENE RECARGAR (--force)`,
        );
      } else {
        const edad = dias !== undefined ? `, cargados hace ${dias} días` : "";
        console.log(`- ${destination.name}: ya tiene ${count} sitios${edad}, se omite (usa --force para recargar)`);
      }
      return;
    }
  }

  const center = await geocode(destination.name);
  const box = boxAround(center, destination.radiusKm);
  process.stdout.write(`- ${destination.name}: consultando Overture… `);

  const rows = await query(`
    SELECT id, names.primary AS name,
           ST_Y(geometry) AS lat, ST_X(geometry) AS lng,
           basic_category, taxonomy.primary AS overture_primary,
           taxonomy.hierarchy AS hierarchy, confidence, websites[1] AS website
    FROM ${FROM}
    WHERE ${boxFilter(box)}
      AND names.primary IS NOT NULL
      AND confidence >= ${MIN_CONFIDENCE}
      AND operating_status IS DISTINCT FROM 'permanently_closed'
      AND basic_category IN (${quoted(Object.keys(CATEGORY_RULES))})
      AND (taxonomy.primary IS NULL OR taxonomy.primary NOT IN (${quoted(EXCLUDED_PRIMARIES)}))
    ORDER BY confidence DESC`);

  // El cupo se reparte por preferencia dominante, no globalmente: si no,
  // una ciudad con 2.000 iglesias llenaría el cupo de cultura y dejaría la
  // ciudad sin una sola playa ni parque.
  const perPreference = new Map<string, number>();
  const perCategory = new Map<string, number>();
  // Las cadenas repiten nombre en cada sucursal: Roma tenía 31 "Upim" entre
  // los 40 sitios de compras. Un itinerario con la misma tienda cuatro veces
  // no es un itinerario.
  const seenNames = new Set<string>();
  const selected: PlaceRow[] = [];

  for (const row of rows) {
    const rule = CATEGORY_RULES[String(row.basic_category)];
    if (!rule) continue;

    const nameKey = normalizeName(String(row.name));
    if (seenNames.has(nameKey)) continue;

    const category = String(row.basic_category);
    const preference = dominantPreference(rule);
    const used = perPreference.get(preference) ?? 0;
    if (used >= MAX_PER_PREFERENCE) continue;
    const usedCategory = perCategory.get(category) ?? 0;
    if (usedCategory >= MAX_PER_CATEGORY) continue;

    seenNames.add(nameKey);
    perPreference.set(preference, used + 1);
    perCategory.set(category, usedCategory + 1);

    selected.push({
      id: String(row.id),
      destination_key: key,
      name: String(row.name),
      latitude: Number(row.lat),
      longitude: Number(row.lng),
      basic_category: String(row.basic_category),
      overture_primary: row.overture_primary ? String(row.overture_primary) : null,
      overture_hierarchy: Array.isArray(row.hierarchy) ? row.hierarchy.map(String) : null,
      preference,
      profile: buildProfile(rule),
      duration_minutes: rule.durationMinutes,
      price_per_person: rule.pricePerPerson,
      opening_hours: openingHoursFor(rule),
      confidence: row.confidence === null ? null : Number(row.confidence),
      website: row.website ? String(row.website) : null,
      overture_release: RELEASE,
    });
  }

  // Borrar y reinsertar en vez de upsert: si un sitio desaparece de un
  // release nuevo, su fila tiene que irse también.
  const { error: deleteError } = await supabase.from("places").delete().eq("destination_key", key);
  if (deleteError) throw new Error(`Supabase (borrado de ${key}): ${deleteError.message}`);

  for (let i = 0; i < selected.length; i += INSERT_BATCH) {
    const { error } = await supabase.from("places").insert(selected.slice(i, i + INSERT_BATCH));
    if (error) throw new Error(`Supabase (inserción en ${key}): ${error.message}`);
  }

  const breakdown = [...perPreference.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`);
  console.log(`${rows.length} candidatos -> ${selected.length} guardados  [${breakdown.join(", ")}]`);
}

// --- ejecución -------------------------------------------------------------
const targets = ONLY
  ? DESTINATIONS.filter((d) => normalizeCityName(d.name) === normalizeCityName(ONLY))
  : DESTINATIONS;

if (targets.length === 0) {
  console.error(`No hay ningún destino que case con --only=${ONLY}. Opciones: ${DESTINATIONS.map((d) => d.name).join(", ")}`);
  process.exit(1);
}

console.log(`Overture release ${RELEASE} · ${targets.length} destino(s) · modo ${INSPECT ? "inspección" : "carga"}`);

for (const destination of targets) {
  try {
    if (INSPECT) await inspect(destination);
    else await load(destination);
  } catch (error) {
    // Un destino que falle no debe tumbar la carga de los demás.
    console.error(`  ! ${destination.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// El resumen va al final para que el aviso no se pierda entre la salida de la
// carga. Los sitios viejos se siguen sirviendo: viejo es mejor que inventado.
if (stale.length > 0) {
  console.log(`\n${stale.length} destino(s) con sitios de más de ${STALE_AFTER_DAYS} días:\n`);
  for (const viejo of stale.sort((a, b) => b.days - a.days)) {
    console.log(`  ${viejo.name.padEnd(14)} ${String(viejo.days).padStart(4)} días  (${viejo.count} sitios)`);
  }
  console.log(`\nRecárgalos con:  npm run pois:load -- --force --only=<destino>`);
}

console.log("\nListo.");
process.exit(0);
