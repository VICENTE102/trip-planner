import { createClient } from "@supabase/supabase-js";

// Vacía las cachés de un destino concreto, para poder arreglar un dato malo
// sin entrar a la base de datos a mano.
//
// Es un script y no un endpoint HTTP a propósito: el Paso 8 iba de reducir la
// superficie de ataque, y esto borra datos. Un endpoint habría que
// autenticarlo, exponerlo y vigilarlo; un script solo lo ejecuta quien ya
// tiene las claves del proyecto.
//
// Autónomo por la misma razón que load-overture-pois.ts: Node ejecuta
// TypeScript quitando los tipos, pero no resuelve los especificadores ".js"
// que usa el backend (obligatorios para Vercel), así que importar
// geocoding.service.ts desde aquí no arrancaría.
//
//   npm run cache:flush -- --destination=Roma              qué se borraría
//   npm run cache:flush -- --destination=Roma --dry-run    lo mismo, explícito
//   npm run cache:flush -- --destination=Roma --confirm    borra de verdad
//   npm run cache:flush -- --destination=Roma --places --confirm
//
// Sin --confirm no se borra nada. Se eligió así, y no un --dry-run opcional,
// porque el fallo por descuido tiene que ser "no he borrado", nunca "he
// borrado lo que no era".

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name: string) => args.includes(`--${name}`);

const destination = arg("destination");
// `--dry-run` es redundante —sin `--confirm` ya no se borra nada— pero se
// acepta porque es lo que uno escribe sin pensar cuando quiere asegurarse, y
// gana a `--confirm` si se pasan los dos. Que la duda salga siempre a favor
// de no borrar.
const alsoPlaces = flag("places");
const confirm = flag("confirm") && !flag("dry-run");

// Radio alrededor del centro de la ciudad dentro del cual se consideran suyos
// los tramos de `routes_cache`.
//
// Esa tabla no tiene columna de destino: sus filas se identifican por
// coordenadas, así que "vaciar Roma" es necesariamente una caja geográfica y
// no un `where destination_key = 'roma'`. Treinta kilómetros cubren de sobra
// cualquier itinerario urbano —el aeropuerto de Fiumicino está a 26 del
// centro— y si de paso cae algún tramo de un pueblo vecino, lo único que
// ocurre es que se vuelve a calcular.
const RADIUS_KM = 30;
const KM_PER_DEGREE_LAT = 111;

// COPIA EXACTA de src/utils/text.ts y de load-overture-pois.ts. Aquí no vale
// "parecida": si esta función produjera una clave distinta, el script
// buscaría una fila que no existe y diría tranquilamente que no hay nada que
// borrar, o peor, borraría la de otro destino. El `split(",")` no es un
// adorno: convierte "Roma, Italia" en "roma", que es como está guardado.
function normalizeCityName(value: string): string {
  return value.split(",")[0].trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta la variable de entorno ${name}. Se leen de .env.local.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  if (!destination) {
    console.error("Uso: npm run cache:flush -- --destination=Roma [--places] [--confirm]");
    process.exit(1);
  }

  const key = normalizeCityName(destination);
  const db = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  // El centro se lee de la propia caché de geocodificación, no se vuelve a
  // pedir a Geoapify: hace falta para acotar los tramos, y gastar una llamada
  // externa para poder borrar sería absurdo. Si el destino no está cacheado,
  // tampoco hay tramos suyos que valga la pena buscar por caja.
  const { data: geo, error: geoError } = await db
    .from("geocoding_cache")
    .select("latitude, longitude, found, created_at")
    .eq("destination_key", key)
    .maybeSingle();

  if (geoError) {
    console.error("No se pudo leer geocoding_cache:", geoError.message);
    process.exit(1);
  }

  console.log(`\nDestino: "${destination}"  ->  clave "${key}"`);
  console.log(confirm ? "Modo: BORRADO REAL\n" : "Modo: simulación (añade --confirm para borrar)\n");

  // --- Geocodificación ---
  console.log(`geocoding_cache : ${geo ? "1 fila" : "0 filas"}${geo && !geo.found ? " (un 'no encontrado')" : ""}`);

  // --- Rutas, por caja geográfica ---
  let routeCount = 0;
  let box: { minLat: number; maxLat: number; minLng: number; maxLng: number } | undefined;

  if (geo?.found && typeof geo.latitude === "number" && typeof geo.longitude === "number") {
    const dLat = RADIUS_KM / KM_PER_DEGREE_LAT;
    // Los meridianos se juntan al alejarse del ecuador: un grado de longitud
    // mide menos kilómetros cuanto mayor es la latitud.
    const dLng = RADIUS_KM / (KM_PER_DEGREE_LAT * Math.cos((geo.latitude * Math.PI) / 180));
    box = {
      minLat: geo.latitude - dLat,
      maxLat: geo.latitude + dLat,
      minLng: geo.longitude - dLng,
      maxLng: geo.longitude + dLng,
    };

    const { count, error } = await db
      .from("routes_cache")
      .select("route_key", { count: "exact", head: true })
      .gte("from_lat", box.minLat)
      .lte("from_lat", box.maxLat)
      .gte("from_lng", box.minLng)
      .lte("from_lng", box.maxLng);

    if (error) {
      console.error("No se pudo contar routes_cache:", error.message);
      process.exit(1);
    }
    routeCount = count ?? 0;
    console.log(`routes_cache    : ${routeCount} filas a menos de ${RADIUS_KM} km del centro`);
  } else {
    console.log(`routes_cache    : no se puede acotar sin coordenadas del destino; se omite`);
  }

  // --- Sitios, solo si se pide ---
  let placeCount = 0;
  if (alsoPlaces) {
    const { count, error } = await db
      .from("places")
      .select("id", { count: "exact", head: true })
      .eq("destination_key", key);

    if (error) {
      console.error("No se pudo contar places:", error.message);
      process.exit(1);
    }
    placeCount = count ?? 0;
    console.log(`places          : ${placeCount} filas`);
    if (placeCount > 0) {
      console.log(
        `\n  AVISO: los sitios NO se reponen solos. Overture no es una API en vivo,\n` +
          `  así que hasta que ejecutes \`npm run pois:load -- --only=${destination}\`\n` +
          `  los itinerarios de este destino usarán actividades simuladas.`,
      );
    }
  } else {
    console.log(`places          : no se toca (añade --places si también quieres recargarlos)`);
  }

  if (!confirm) {
    console.log("\nNo se ha borrado nada. Repite con --confirm para hacerlo.\n");
    return;
  }

  // --- Borrado ---
  if (geo) {
    const { error } = await db.from("geocoding_cache").delete().eq("destination_key", key);
    if (error) console.error("Error borrando geocoding_cache:", error.message);
    else console.log("\nBorrada la geocodificación.");
  }

  if (box && routeCount > 0) {
    const { error } = await db
      .from("routes_cache")
      .delete()
      .gte("from_lat", box.minLat)
      .lte("from_lat", box.maxLat)
      .gte("from_lng", box.minLng)
      .lte("from_lng", box.maxLng);
    if (error) console.error("Error borrando routes_cache:", error.message);
    else console.log(`Borrados ${routeCount} tramos.`);
  }

  if (alsoPlaces && placeCount > 0) {
    const { error } = await db.from("places").delete().eq("destination_key", key);
    if (error) console.error("Error borrando places:", error.message);
    else console.log(`Borrados ${placeCount} sitios. Recárgalos con: npm run pois:load -- --only=${destination}`);
  }

  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
