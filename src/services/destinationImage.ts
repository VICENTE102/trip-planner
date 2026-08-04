import { normalizeCityName } from "../utils/text";

// Hand-picked, verified real photographs (never paintings/flags/icons) of a
// well-known landmark for common destinations. Checked individually against
// the Wikimedia Commons file behind each URL.
// Always the plain, unscaled Commons file URL: Wikimedia's thumbnail
// endpoint only accepts a whitelisted set of widths (arbitrary ones like
// "1600px-" 400), so we skip resizing entirely and let the browser scale.
const CURATED_IMAGES: Record<string, string> = {
  paris: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Eiffelturm.JPG",
  roma: "https://upload.wikimedia.org/wikipedia/commons/d/de/Colosseo_2020.jpg",
  rome: "https://upload.wikimedia.org/wikipedia/commons/d/de/Colosseo_2020.jpg",
  barcelona: "https://upload.wikimedia.org/wikipedia/commons/7/78/SF_maig_2026.jpg",
  londres: "https://upload.wikimedia.org/wikipedia/commons/4/43/Elizabeth_Tower%2C_June_2022.jpg",
  london: "https://upload.wikimedia.org/wikipedia/commons/4/43/Elizabeth_Tower%2C_June_2022.jpg",
  budapest: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Budapest-Parliament-0001.jpg",
  praga: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Karl%C5%AFv_most_z_Kampy.JPG",
  prague: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Karl%C5%AFv_most_z_Kampy.JPG",
  amsterdam: "https://upload.wikimedia.org/wikipedia/commons/a/af/Amsterdam_airphoto.jpg",
  berlin: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Brandenburger_Tor_abends.jpg",
  vienna: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Wien_-_Schloss_Sch%C3%B6nbrunn.JPG",
  viena: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Wien_-_Schloss_Sch%C3%B6nbrunn.JPG",
  lisboa: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Bel%C3%A9m_Tower_in_Lisbon%2C_Portugal.jpg",
  lisbon: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Bel%C3%A9m_Tower_in_Lisbon%2C_Portugal.jpg",
  venecia: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Rialto_2025_4.jpg",
  venice: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Rialto_2025_4.jpg",
  milan: "https://upload.wikimedia.org/wikipedia/commons/7/70/Milan_Cathedral_from_Piazza_del_Duomo.jpg",
  milán: "https://upload.wikimedia.org/wikipedia/commons/7/70/Milan_Cathedral_from_Piazza_del_Duomo.jpg",
  estambul:
    "https://upload.wikimedia.org/wikipedia/commons/1/12/Exterior_of_Sultan_Ahmed_I_Mosque_in_Istanbul%2C_Turkey_002.jpg",
  istanbul:
    "https://upload.wikimedia.org/wikipedia/commons/1/12/Exterior_of_Sultan_Ahmed_I_Mosque_in_Istanbul%2C_Turkey_002.jpg",
  dublin: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Trinity_College_Dublin_Campanile.jpg",
  dublín: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Trinity_College_Dublin_Campanile.jpg",
  atenas: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Classic_view_of_Acropolis.jpg",
  athens: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Classic_view_of_Acropolis.jpg",
  "nueva york": "https://upload.wikimedia.org/wikipedia/commons/a/a1/Statue_of_Liberty_7.jpg",
  "new york": "https://upload.wikimedia.org/wikipedia/commons/a/a1/Statue_of_Liberty_7.jpg",
  sevilla: "https://upload.wikimedia.org/wikipedia/commons/9/93/La_Giralda_August_2012_Seville_Spain.jpg",
  seville: "https://upload.wikimedia.org/wikipedia/commons/9/93/La_Giralda_August_2012_Seville_Spain.jpg",
};

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;

const cache = new Map<string, string | null>();

async function fetchPexelsPhoto(city: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(`${city} landmark`)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } },
    );
    if (!response.ok) return null;

    const data = await response.json();
    return data.photos?.[0]?.src?.large2x ?? data.photos?.[0]?.src?.large ?? null;
  } catch {
    return null;
  }
}

export async function getDestinationImageUrl(destination: string): Promise<string | null> {
  const city = normalizeCityName(destination);
  if (!city) return null;

  if (CURATED_IMAGES[city]) {
    return CURATED_IMAGES[city];
  }

  if (cache.has(city)) {
    return cache.get(city) ?? null;
  }

  const imageUrl = await fetchPexelsPhoto(city);
  cache.set(city, imageUrl);
  return imageUrl;
}
