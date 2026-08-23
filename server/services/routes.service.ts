import type { RoutePlace, TravelMatrixEntry } from "../types/route.js";
import { getOpenRouteServiceApiKey } from "../config/env.js";
import { calculateTravelMatrix } from "../algorithms/cluster-places.js";
import {
  WALKING_PROFILE,
  createOpenRouteServiceProvider,
  type OpenRouteServiceProvider,
} from "../providers/openrouteservice-routes.provider.js";
import { readCachedLegs, routeKey, writeCachedLegs, type LegToCache } from "../repositories/routes.repository.js";
import { canCallProvider, recordProviderCall } from "./usage.service.js";

// Por encima de este tiempo andando, el trayecto deja de ser "un paseo entre
// dos museos" y pasa a ser algo que cualquiera haría en metro. Como la API
// pública de ORS no tiene transporte público, ahí se estima — pero sobre la
// distancia real, ver entryFromRealLeg.
const WALK_CAP_MINUTES = 45;

// Tope de puntos por matriz de ORS (50x50 = 2.500 pares, dentro de los 3.500
// que admite). Por encima de esto no se llama: es preferible degradar a la
// estimación en línea recta que provocar un 4xx del proveedor. Con la
// selección actual (~10 actividades y unos pocos hoteles) no se alcanza.
const MAX_MATRIX_LOCATIONS = 50;

let realProvider: OpenRouteServiceProvider | undefined | null = null;

// null = todavía no se ha mirado; undefined = ya se miró y no hay clave.
function getRealProvider(): OpenRouteServiceProvider | undefined {
  if (realProvider === null) {
    const apiKey = getOpenRouteServiceApiKey();
    realProvider = apiKey ? createOpenRouteServiceProvider(apiKey) : undefined;
    if (!realProvider) {
      console.warn("[routes] ORS_API_KEY no configurada; los desplazamientos se estimarán en línea recta.");
    }
  }
  return realProvider;
}

const pairKey = (fromId: string, toId: string) => `${fromId}->${toId}`;

function toMinutes(durationSeconds: number): number {
  return Math.max(1, Math.round(durationSeconds / 60));
}

// Estimación de transporte público, para los trayectos que no se andan.
//
// Se calcula sobre la distancia REAL por calle que acaba de dar ORS, no
// sobre la línea recta. La diferencia no es menor: con la línea recta a
// 20 km/h, el Coliseo y la Basílica de San Pedro salían a 10 minutos.
// Convertir un 49 real en un 10 inventado es peor que no tener respaldo.
//
// Los minutos de acceso cubren lo que no es ir en el vehículo: llegar a la
// parada, esperar y salir. Es lo que hace que un trayecto corto en metro no
// baje de unos 10 minutos en la vida real.
const TRANSIT_ACCESS_MINUTES = 8;
const TRANSIT_SPEED_KMH = 18;

// Convierte un tramo real en una entrada de la matriz. Por debajo del tope
// se muestra el tiempo a pie tal cual; por encima, la estimación de
// transporte sobre esa misma distancia real.
function entryFromRealLeg(
  fromId: string,
  toId: string,
  durationSeconds: number,
  distanceKm: number,
): TravelMatrixEntry {
  const walkMinutes = toMinutes(durationSeconds);
  // Andando es el único caso en que el número NO es una estimación: ORS lo ha
  // medido sobre el callejero real.
  const realWalk: TravelMatrixEntry = {
    fromId,
    toId,
    distanceKm,
    travelMinutes: walkMinutes,
    transportMode: "walk",
    estimated: false,
  };

  if (walkMinutes <= WALK_CAP_MINUTES) {
    return realWalk;
  }

  const transitMinutes = Math.round(TRANSIT_ACCESS_MINUTES + (distanceKm / TRANSIT_SPEED_KMH) * 60);
  // Si la estimación en transporte sale peor que ir andando, se anda: es una
  // opción real y además es el dato que sí conocemos de verdad.
  if (transitMinutes >= walkMinutes) {
    return realWalk;
  }

  // Distancia real, tiempo supuesto: ORS no da transporte público, así que
  // esto sigue siendo una estimación por mucho que parta de un dato medido.
  return { fromId, toId, distanceKm, travelMinutes: transitMinutes, transportMode: "transit", estimated: true };
}

// Devuelve la matriz de desplazamientos entre todos los puntos, resolviendo
// en este orden:
//
//   caché de Supabase -> OpenRouteService (una sola matriz) -> mock haversine
//
// Nunca lanza: un itinerario no puede quedarse sin construir porque el
// servicio de rutas esté caído. En el peor caso se degrada a la estimación
// en línea recta, que es exactamente el comportamiento anterior al Paso 5.
export async function resolveTravelMatrix(places: RoutePlace[]): Promise<TravelMatrixEntry[]> {
  // La estimación en línea recta se calcula siempre: es gratis y es el
  // respaldo de cada par que no se pueda resolver de verdad. Lo que NO hace
  // ya es decidir los trayectos largos — de eso se encarga entryFromRealLeg
  // con la distancia real.
  const fallbackEntries = calculateTravelMatrix(places);
  if (places.length < 2) {
    return fallbackEntries;
  }

  const byId = new Map(places.map((place) => [place.id, place]));

  const keyByPair = new Map<string, string>();
  for (const entry of fallbackEntries) {
    const from = byId.get(entry.fromId);
    const to = byId.get(entry.toId);
    if (from && to) {
      keyByPair.set(pairKey(entry.fromId, entry.toId), routeKey(WALKING_PROFILE, from, to));
    }
  }

  const cached = await readCachedLegs([...new Set(keyByPair.values())]);
  const resolved = new Map<string, TravelMatrixEntry>();

  for (const [pair, key] of keyByPair) {
    const hit = cached.get(key);
    if (!hit) continue;
    const [fromId, toId] = pair.split("->");
    resolved.set(pair, entryFromRealLeg(fromId, toId, hit.durationSeconds, hit.distanceKm));
  }

  const allResolved = resolved.size === keyByPair.size;
  const provider = getRealProvider();
  const tooManyForOneMatrix = places.length > MAX_MATRIX_LOCATIONS;
  if (tooManyForOneMatrix) {
    console.warn(`[routes] ${places.length} puntos superan el máximo de ${MAX_MATRIX_LOCATIONS}; se estiman en línea recta.`);
  }

  // Paso 8: por encima del tope diario se estima en línea recta en vez de
  // llamar. Se comprueba solo si de verdad hiciera falta llamar.
  const withinBudget = allResolved || !provider ? true : await canCallProvider("openrouteservice");

  if (allResolved || !provider || tooManyForOneMatrix || !withinBudget) {
    // Sin clave no se cachea nada: guardar la estimación del mock dejaría
    // tiempos inventados clavados y configurar ORS_API_KEY más tarde ya no
    // arreglaría estos pares.
    return fallbackEntries.map((entry) => resolved.get(pairKey(entry.fromId, entry.toId)) ?? entry);
  }

  try {
    // Una única petición para todos los puntos aunque falte un solo par: la
    // matriz vuelve entera de todas formas, y así una búsqueda gasta como
    // mucho una llamada.
    const legs = await provider.calculateLegs(places);
    await recordProviderCall("openrouteservice");
    const toCache: LegToCache[] = [];

    for (const leg of legs) {
      const pair = pairKey(leg.fromId, leg.toId);
      const key = keyByPair.get(pair);
      const from = byId.get(leg.fromId);
      const to = byId.get(leg.toId);
      if (!key || !from || !to) continue;

      resolved.set(pair, entryFromRealLeg(leg.fromId, leg.toId, leg.durationSeconds, leg.distanceKm));
      toCache.push({
        routeKey: key,
        profile: WALKING_PROFILE,
        fromLat: from.latitude,
        fromLng: from.longitude,
        toLat: to.latitude,
        toLng: to.longitude,
        durationSeconds: leg.durationSeconds,
        distanceKm: leg.distanceKm,
        provider: provider.name,
      });
    }

    await writeCachedLegs(toCache);
  } catch (error) {
    // Fallo de red, cuota o respuesta ilegible: no se cachea nada, para que
    // la siguiente búsqueda lo reintente. Los pares que ya venían de caché
    // se conservan; el resto cae a la estimación.
    console.error("[routes] Error calculando la matriz con OpenRouteService", error);
  }

  return fallbackEntries.map((entry) => resolved.get(pairKey(entry.fromId, entry.toId)) ?? entry);
}
