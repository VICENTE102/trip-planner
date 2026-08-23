import { useEffect, useRef, useState } from "react";
// Importaciones con nombre: maplibre-gl v6 no tiene export por defecto.
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, LineString } from "geojson";
import type { DayStop, TierLevel } from "../types";
import { MAP_STYLE_URL } from "../constants/mapStyle";
import { onStyleReady } from "../utils/mapStyleReady";
import { MAP_BOX_CLASSES } from "./mapBox";

interface DayMapProps {
  stops: DayStop[];
  tier: TierLevel;
}

// Mismo hue por tier que TIER_THEME.solidBg (constants/tierTheme.ts), pero
// en hexadecimal: MapLibre pinta capas y marcadores con color CSS directo,
// no acepta clases de Tailwind.
const TIER_HEX: Record<TierLevel, string> = {
  barato: "#10b981",
  medio: "#6366f1",
  caro: "#f59e0b",
};

const ROUTE_SOURCE = "route";
const ROUTE_LAYER = "route-line";
const SINGLE_STOP_ZOOM = 14;

function buildMarkerElement(index: number, color: string): HTMLElement {
  const element = document.createElement("div");
  element.className =
    "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md";
  element.style.background = color;
  element.textContent = String(index + 1);
  return element;
}

// El contenido del popup se construye con nodos y textContent, no con
// setHTML: el texto de una parada puede venir de una edición del usuario
// (utils/itineraryEdits.ts), y concatenarlo dentro de HTML sería inyectar
// lo que escriba en el DOM.
function buildPopupContent(stop: DayStop): HTMLElement {
  const wrapper = document.createElement("div");

  const label = document.createElement("p");
  label.className = "text-xs font-bold uppercase tracking-wide text-ink-500";
  label.textContent = stop.label;

  const text = document.createElement("p");
  text.className = "text-sm text-ink-700";
  text.textContent = stop.text;

  wrapper.append(label, text);
  return wrapper;
}

export function DayMap({ stops, tier }: DayMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [failed, setFailed] = useState(false);

  const hasStops = stops.length > 0;
  const color = TIER_HEX[tier];

  // Creación del mapa. Depende solo de si hay paradas o no, nunca del día
  // seleccionado: cambiar de día NO vuelve a pasar por aquí, que es justo lo
  // que evita recrear el contexto WebGL en cada pulsación.
  useEffect(() => {
    if (!hasStops || !containerRef.current || mapRef.current) return;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: [0, 0],
        zoom: 1,
        // Se desactiva la por defecto para volver a añadirla en modo compacto
        // (el mapa ocupa media pantalla y el aviso completo se come una
        // esquina). El texto lo aporta el proveedor, ver constants/mapStyle.ts.
        attributionControl: false,
      });
    } catch {
      // Sin WebGL (navegador antiguo, aceleración desactivada) el
      // constructor lanza. Mejor un aviso que una caja rota.
      setFailed(true);
      return;
    }

    map.addControl(new AttributionControl({ compact: true }));
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (event) => console.error("[map]", event.error));

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [hasStops]);

  // Actualización por día: se reemplazan los datos de la línea y los
  // marcadores sobre el mapa que ya existe, y se reencuadra con una
  // animación en vez de saltar.
  //
  // Lo que depende del estilo del mapa se reduce aquí al mínimo, y la espera
  // la resuelve onStyleReady() (utils/mapStyleReady.ts), que tiene sus
  // propias pruebas. Antes se esperaba con `map.once("load")`: un evento que
  // ocurre una sola vez en la vida del mapa, cuando `isStyleLoaded()` vuelve
  // a false constantemente. Caer en ese hueco dejaba el mapa mudo para
  // siempre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasStops) return;

    const coordinates = stops.map((stop) => [stop.lng, stop.lat] as [number, number]);

    // Las paradas y el encuadre van SIN esperar a nada.
    //
    // Antes todo esto colgaba de que el estilo estuviera cargado, y ahí es
    // donde se rompía: con el proveedor de teselas a medio responder, el mapa
    // nunca se daba por cargado y el día se quedaba sin un solo marcador,
    // encuadrado en el Atlántico. La pestaña entera quedaba inservible por un
    // problema del mapa de fondo.
    //
    // Y no hacía ninguna falta esperar: un Marker es un div que MapLibre
    // coloca sobre el lienzo, y fitBounds es un movimiento de cámara. Ni uno
    // ni otro tocan el estilo. Lo único que sí lo necesita es la capa de la
    // línea, y esa se añade aparte, más abajo. Si el fondo tarda o falla, se
    // pierde la línea de puntos: nunca las paradas.
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = stops.map((stop, index) =>
      new Marker({ element: buildMarkerElement(index, color), anchor: "bottom" })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(new Popup({ offset: 32 }).setDOMContent(buildPopupContent(stop)))
        .addTo(map),
    );

    if (coordinates.length === 1) {
      map.easeTo({ center: coordinates[0], zoom: SINGLE_STOP_ZOOM });
    } else {
      const bounds = coordinates.reduce(
        (acc, coordinate) => acc.extend(coordinate),
        new LngLatBounds(coordinates[0], coordinates[0]),
      );
      map.fitBounds(bounds, { padding: 48, maxZoom: 16 });
    }

    // La línea que une las paradas sí es una capa del estilo, y addSource()
    // lanza si el estilo no ha terminado. Se espera solo para esto.
    function drawRouteLine() {
      const line: Feature<LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      };

      const existing = map!.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(line);
        map!.setPaintProperty(ROUTE_LAYER, "line-color", color);
      } else {
        map!.addSource(ROUTE_SOURCE, { type: "geojson", data: line });
        map!.addLayer({
          id: ROUTE_LAYER,
          type: "line",
          source: ROUTE_SOURCE,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": color, "line-width": 3, "line-dasharray": [2, 2] },
        });
      }
    }

    return onStyleReady(map, drawRouteLine);
  }, [stops, color, hasStops]);

  // Un día puede quedarse sin ninguna parada con coordenadas (p. ej. el día
  // de llegada, ocupado por el vuelo y el registro en el hotel).
  if (!hasStops) {
    return (
      <div className={`flex items-center justify-center border-dashed bg-ink-50 p-6 text-center ${MAP_BOX_CLASSES}`}>
        <p className="text-sm text-ink-500">
          Este día no tiene visitas programadas, así que no hay ruta que dibujar en el mapa.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`flex items-center justify-center border-dashed bg-ink-50 p-6 text-center ${MAP_BOX_CLASSES}`}>
        <p className="text-sm text-ink-500">
          No se ha podido cargar el mapa en este navegador. Las paradas del día siguen listadas a la izquierda.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className={`overflow-hidden ${MAP_BOX_CLASSES}`} />;
}
