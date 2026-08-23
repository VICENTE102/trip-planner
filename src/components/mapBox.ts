// La caja del mapa del día, en un solo sitio.
//
// Estaba repetida en tres: el mapa, su marcador de carga y los dos avisos de
// "sin ruta que dibujar". Tres copias de `h-[420px] ... lg:h-full` que había
// que acordarse de cambiar a la vez.
//
// El `lg:h-full` de antes se rompió al meter el mapa y el recorrido del día
// en una misma columna: "el 100% de la altura" pasó a medirse contra esa
// columna, que ya no es la fila de la rejilla, y el mapa salía de 194 px o
// de 316 según cuánto texto tuviera el recorrido de debajo. Ahora crece con
// `flex-1` para ocupar lo que sobre, con un mínimo por si sobra poco.
export const MAP_BOX_CLASSES =
  "h-[420px] rounded-2xl border border-ink-200 lg:h-auto lg:min-h-[280px] lg:flex-1";
