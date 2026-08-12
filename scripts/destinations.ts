// Destinos de la carga inicial. Se empieza por 10 para validar el proceso
// completo; ampliar es añadir nombres aquí y volver a ejecutar el cargador
// (solo descarga los que falten, salvo que se pase --force).
//
// No hay bounding boxes escritas a mano: el cargador geocodifica cada nombre
// y construye la caja alrededor del centro con `radiusKm`. Así la lista es
// legible y no hay coordenadas copiadas de ningún sitio que puedan estar mal.
//
// El nombre es el que escribiría un usuario en el formulario, en español: se
// normaliza con las mismas reglas que geocoding_cache (sin acentos, en
// minúsculas), así que "París" y "paris" acaban en la misma clave.
export interface DestinationSeed {
  name: string;
  radiusKm: number;
}

export const DESTINATIONS: DestinationSeed[] = [
  { name: "Roma", radiusKm: 12 },
  { name: "Barcelona", radiusKm: 10 },
  { name: "París", radiusKm: 12 },
  { name: "Lisboa", radiusKm: 10 },
  { name: "Ámsterdam", radiusKm: 9 },
  { name: "Praga", radiusKm: 9 },
  { name: "Berlín", radiusKm: 14 },
  { name: "Viena", radiusKm: 11 },
  { name: "Florencia", radiusKm: 7 },
  { name: "Oporto", radiusKm: 8 },
];
