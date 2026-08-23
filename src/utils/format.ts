// Formato de distancia, igual que el que usa el motor para redactar sus
// razones (server/algorithms/select-proposals.ts): por debajo del kilómetro
// se dice en metros, porque "0,4 km" se lee peor que "400 m".
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// Minutos a algo que se lee de un vistazo: "45 min", "1 h 15 min", "2 h".
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
