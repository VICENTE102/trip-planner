import type { Hotel, SearchParams, TierLevel } from "../types";
import { createSeededRandom, hashString, pick } from "../utils/random";

export interface HotelProvider {
  getHotels(params: SearchParams, nights: number): Hotel[];
}

const NAME_PREFIXES = ["Hotel", "Suites", "Residencia", "Posada", "Hostal"];
const NAME_SUFFIXES = ["Central", "Plaza", "Mirador", "del Puerto", "Real", "Boutique"];

const AMENITIES_BY_TIER: Record<TierLevel, string[]> = {
  barato: ["Wifi gratis", "Aire acondicionado"],
  medio: ["Wifi gratis", "Desayuno incluido", "Piscina"],
  caro: ["Wifi gratis", "Desayuno incluido", "Spa", "Piscina", "Vistas panorámicas"],
};

const TIER_CONFIG: Record<TierLevel, { multiplier: number; stars: [number, number]; rating: [number, number] }> = {
  barato: { multiplier: 0.6, stars: [2, 3], rating: [3.4, 4.2] },
  medio: { multiplier: 1.0, stars: [3, 4], rating: [3.9, 4.6] },
  caro: { multiplier: 1.6, stars: [4, 5], rating: [4.3, 5.0] },
};

function randomInRange(random: () => number, [min, max]: [number, number]): number {
  return min + random() * (max - min);
}

export const mockHotelProvider: HotelProvider = {
  getHotels(params, nights) {
    const perNightBudget = params.budget / nights;

    const seed = hashString(`${params.destination}-${params.departureDate}-${params.budget}`);

    return (Object.keys(TIER_CONFIG) as TierLevel[]).map((tier, index) => {
      const random = createSeededRandom(seed + index);
      const config = TIER_CONFIG[tier];
      const pricePerNight = Math.round(perNightBudget * config.multiplier);

      return {
        id: `${tier}-${seed}-${index}`,
        name: `${pick(NAME_PREFIXES, random)} ${params.destination} ${pick(NAME_SUFFIXES, random)}`,
        tier,
        pricePerNight,
        totalPrice: pricePerNight * nights,
        rating: Math.round(randomInRange(random, config.rating) * 10) / 10,
        stars: Math.round(randomInRange(random, config.stars)),
        amenities: AMENITIES_BY_TIER[tier],
      };
    });
  },
};
