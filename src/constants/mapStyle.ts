// Proveedor de teselas del mapa, en un único sitio a propósito.
//
// OpenFreeMap: sin clave, sin registro, sin límites declarados y con uso
// comercial permitido. Lo mantiene una sola persona con donaciones y no
// ofrece SLA, así que el día que haya que cambiar de proveedor conviene que
// sea una línea y no una búsqueda por todo el proyecto.
//
// Alternativa anotada: Maptoolkit (https://www.maptoolkit.org) — también sin
// clave ni límites, uso comercial permitido por debajo de 1 M€ de
// facturación. Es más nuevo, de ahí que sea el segundo plato y no el primero.
//
// Se descartaron: Protomaps (su servidor gratuito es solo para uso NO
// comercial, y TripPlanner llevará enlaces de afiliado), MapTiler (exige
// clave y limita a 1 M de peticiones al mes) y seguir con las teselas raster
// de openstreetmap.org (su política pide un User-Agent identificativo que un
// navegador no puede enviar, y avisa de que el acceso puede retirarse en
// cualquier momento a los usos comerciales).
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// La atribución del mapa NO se fija aquí: la pone MapLibre sola.
//
// El JSON del estilo no declara `attribution` en sus fuentes, así que al
// auditarlo parecía que el control saldría vacío y habría que rellenarlo a
// mano. No es así: la fuente `openmaptiles` apunta a un TileJSON
// (tiles.openfreemap.org/planet) que sí lo trae, y MapLibre lo lee de ahí.
// Al pasarlo además a mano, el mapa mostraba la atribución DOS veces.
//
// El aviso que se ve en el mapa es "OpenFreeMap © OpenMapTiles Data from
// OpenStreetMap". La atribución permanente y bajo nuestro control vive en la
// página /fuentes (screens/DataSourcesScreen.tsx), que es la que garantiza el
// cumplimiento de la ODbL aunque el proveedor cambie su TileJSON.
