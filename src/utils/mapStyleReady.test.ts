import { describe, expect, it, vi } from "vitest";
import { onStyleReady, type StyleLoadableMap } from "./mapStyleReady";

// Mapa de mentira con el comportamiento que importa: se puede decir si el
// estilo está cargado y se pueden emitir eventos "styledata" a mano.
function fakeMap(styleLoaded = false) {
  const listeners = new Set<() => void>();
  const map = {
    styleLoaded,
    isStyleLoaded: () => map.styleLoaded,
    on: (_event: "styledata", listener: () => void) => listeners.add(listener),
    off: (_event: "styledata", listener: () => void) => listeners.delete(listener),
    /** Simula que llega un trozo de estilo. */
    emit: () => [...listeners].forEach((listener) => listener()),
    listenerCount: () => listeners.size,
  };
  return map as StyleLoadableMap & typeof map;
}

describe("onStyleReady", () => {
  it("dibuja de inmediato si el estilo ya estaba cargado", () => {
    const draw = vi.fn();
    onStyleReady(fakeMap(true), draw);

    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("espera a que el estilo cargue si todavía no lo está", () => {
    const map = fakeMap(false);
    const draw = vi.fn();
    onStyleReady(map, draw);

    expect(draw).not.toHaveBeenCalled();

    map.styleLoaded = true;
    map.emit();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  // EL fallo. Con `map.once("load")` este caso se quedaba esperando para
  // siempre: "load" ya se había disparado y no vuelve. El día se quedaba sin
  // marcadores y el mapa en la vista mundial, en mitad del Atlántico.
  it("dibuja aunque el evento de carga ya haya pasado", () => {
    const map = fakeMap(false); // "load" ya ocurrió; el estilo está reponiéndose
    const draw = vi.fn();
    onStyleReady(map, draw);

    // Llegan trozos de estilo mientras aún no está listo: no se dibuja...
    map.emit();
    map.emit();
    expect(draw).not.toHaveBeenCalled();

    // ...y en cuanto se estabiliza, sí.
    map.styleLoaded = true;
    map.emit();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  // `styledata` se emite muchas veces por cada movimiento de cámara. Dibujar
  // en cada una recrearía los marcadores sin parar.
  it("dibuja una sola vez por mucho que siga llegando estilo", () => {
    const map = fakeMap(false);
    const draw = vi.fn();
    onStyleReady(map, draw);

    map.styleLoaded = true;
    map.emit();
    map.emit();
    map.emit();

    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("se desuscribe en cuanto ha dibujado", () => {
    const map = fakeMap(false);
    onStyleReady(map, () => {});

    expect(map.listenerCount()).toBe(1);
    map.styleLoaded = true;
    map.emit();
    expect(map.listenerCount()).toBe(0);
  });

  // Cambiar de día vuelve a lanzar el efecto: la espera anterior tiene que
  // poder cancelarse, o se dibujaría el día que ya no está seleccionado.
  it("cancelar impide que dibuje", () => {
    const map = fakeMap(false);
    const draw = vi.fn();
    const cancel = onStyleReady(map, draw);

    cancel();
    map.styleLoaded = true;
    map.emit();

    expect(draw).not.toHaveBeenCalled();
    expect(map.listenerCount()).toBe(0);
  });

  it("cancelar es inofensivo si ya había dibujado", () => {
    const map = fakeMap(true);
    const draw = vi.fn();

    expect(() => onStyleReady(map, draw)()).not.toThrow();
    expect(draw).toHaveBeenCalledTimes(1);
  });
});
