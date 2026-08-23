// Lo mínimo que esta función necesita saber de un mapa de MapLibre. Se
// declara aquí en vez de importar el tipo real para poder probarla sin
// WebGL ni un DOM: los marcadores del itinerario se dejaron de pintar por
// un fallo en estas quince líneas y merecen prueba propia.
export interface StyleLoadableMap {
  // MapLibre declara `boolean | void`: devuelve void si todavía no hay
  // estilo asignado. Se trata como "no listo", que es lo que significa.
  isStyleLoaded(): boolean | void;
  on(event: "styledata", listener: () => void): unknown;
  off(event: "styledata", listener: () => void): unknown;
}

/**
 * Ejecuta `callback` una sola vez, en cuanto el estilo del mapa esté listo.
 * Devuelve la función para cancelar la espera.
 *
 * Nace de un fallo real: los marcadores y la ruta del día no se pintaban
 * nunca y el mapa se quedaba en la vista mundial, en mitad del Atlántico.
 * El código anterior era este:
 *
 *     if (map.isStyleLoaded()) draw();
 *     else map.once("load", () => draw());
 *
 * y tiene un agujero. `load` se dispara UNA vez en la vida de un mapa,
 * mientras que `isStyleLoaded()` vuelve a false cada vez que el estilo está
 * a medio actualizar: cargando teselas, sprites o tipografías, cosa que
 * pasa constantemente y sobre todo después de mover la cámara. Si el efecto
 * caía en ese hueco —`load` ya disparado, estilo momentáneamente no
 * cargado— se quedaba esperando un evento que no iba a volver, y ese mapa
 * ya no dibujaba nada nunca más.
 *
 * Se escuchaba `load` en vez de guardar un estado `ready` para sobrevivir al
 * doble montaje de StrictMode. Eso sigue vigente: aquí tampoco hay estado de
 * React, solo una suscripción que se cancela sola.
 *
 * `styledata` es el evento correcto porque se emite CADA vez que llega un
 * trozo de estilo, no una sola vez, así que sirve tanto si aún no ha cargado
 * como si ya cargó y volverá a estabilizarse enseguida.
 */
export function onStyleReady(map: StyleLoadableMap, callback: () => void): () => void {
  if (map.isStyleLoaded() === true) {
    callback();
    return () => {};
  }

  let done = false;

  const listener = () => {
    if (done || map.isStyleLoaded() !== true) return;
    done = true;
    map.off("styledata", listener);
    callback();
  };

  map.on("styledata", listener);

  return () => {
    done = true;
    map.off("styledata", listener);
  };
}
