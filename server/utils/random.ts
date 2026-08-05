// Copia server-side de src/utils/random.ts. Se duplica deliberadamente en
// lugar de importarse desde src/ para mantener api/ y server/ como un
// realm de Node totalmente independiente del bundle del frontend (Vite).

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// mulberry32: PRNG determinista y rápido para que los mocks sean estables
// para una misma búsqueda.
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}
