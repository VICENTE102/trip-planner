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
  madrid: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Palacio_Real_de_Madrid_Julio_2016_%28cropped%29.jpg",
  florencia:
    "https://upload.wikimedia.org/wikipedia/commons/c/c7/Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg",
  florence:
    "https://upload.wikimedia.org/wikipedia/commons/c/c7/Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg",
  munich: "https://upload.wikimedia.org/wikipedia/commons/7/73/Rathaus_and_Marienplatz_from_Peterskirche_-_August_2006.jpg",
  bruselas: "https://upload.wikimedia.org/wikipedia/commons/2/26/Grand-Place%2C_Brussels_-_panorama%2C_June_2018.jpg",
  brussels: "https://upload.wikimedia.org/wikipedia/commons/2/26/Grand-Place%2C_Brussels_-_panorama%2C_June_2018.jpg",
  edimburgo: "https://upload.wikimedia.org/wikipedia/commons/5/59/City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg",
  edinburgh: "https://upload.wikimedia.org/wikipedia/commons/5/59/City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg",
  copenhague: "https://upload.wikimedia.org/wikipedia/commons/a/ad/The_Nyhavn_Canal_3.jpg",
  copenhagen: "https://upload.wikimedia.org/wikipedia/commons/a/ad/The_Nyhavn_Canal_3.jpg",
  estocolmo: "https://upload.wikimedia.org/wikipedia/commons/1/14/Stockholms_Stadshuset_City_Hall_Stockholm_2016_01.jpg",
  stockholm: "https://upload.wikimedia.org/wikipedia/commons/1/14/Stockholms_Stadshuset_City_Hall_Stockholm_2016_01.jpg",
  oslo: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Lh%C3%B4tel_de_ville_dOslo_%284854168964%29.jpg",
  varsovia: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Royal_Castle_in_Warsaw%2C_Poland%2C_2022%2C_03.jpg",
  warsaw: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Royal_Castle_in_Warsaw%2C_Poland%2C_2022%2C_03.jpg",
  cracovia: "https://upload.wikimedia.org/wikipedia/commons/8/87/Wawel_%284%29.jpg",
  krakow: "https://upload.wikimedia.org/wikipedia/commons/8/87/Wawel_%284%29.jpg",
  zurich: "https://upload.wikimedia.org/wikipedia/commons/1/11/Grossm%C3%BCnster_-_M%C3%BCnsterhof_2014-05-23_12-08-43.JPG",
  napoles: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Castel_dell%27_Ovo.jpg",
  naples: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Castel_dell%27_Ovo.jpg",
  valencia: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Valencia_cathedral_2022_-_north_fa%C3%A7ade_dawn.jpg",
  oporto: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Dom_Lu%C3%ADs_I_Bridge_%2836961760686%29.jpg",
  porto: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Dom_Lu%C3%ADs_I_Bridge_%2836961760686%29.jpg",
  malaga: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Alcazaba_de_M%C3%A1laga_overview.jpg",
  bilbao: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Museo_Guggenheim%2C_Bilbao_%2831273245344%29.jpg",
  granada: "https://upload.wikimedia.org/wikipedia/commons/d/de/Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg",
  "palma de mallorca": "https://upload.wikimedia.org/wikipedia/commons/1/12/Kathedrale_von_Palma_II.jpg",
  turin: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Mole_Antonelliana_%28Torino%29_09.jpg",
  bolonia: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Asinelli_e_Garisenda.jpg",
  bologna: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Asinelli_e_Garisenda.jpg",
  verona: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Arena-XE3F2406a.jpg",
  hamburgo: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Elbphilharmonie_2025.jpg",
  hamburg: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Elbphilharmonie_2025.jpg",
  colonia: "https://upload.wikimedia.org/wikipedia/commons/0/04/K%C3%B6lner_Dom_-_Westfassade_2022_ohne_Ger%C3%BCst-0968_b.jpg",
  cologne: "https://upload.wikimedia.org/wikipedia/commons/0/04/K%C3%B6lner_Dom_-_Westfassade_2022_ohne_Ger%C3%BCst-0968_b.jpg",
  francfort: "https://upload.wikimedia.org/wikipedia/commons/4/48/Frankfurter_R%C3%B6mer_2019.jpg",
  frankfurt: "https://upload.wikimedia.org/wikipedia/commons/4/48/Frankfurter_R%C3%B6mer_2019.jpg",
  ginebra: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Jet_d%27eau_de_Gen%C3%A8ve_%28swiss%29.jpg",
  geneva: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Jet_d%27eau_de_Gen%C3%A8ve_%28swiss%29.jpg",
  salzburgo: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Salzburg_-_Festung_Hohensalzburg.JPG",
  salzburg: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Salzburg_-_Festung_Hohensalzburg.JPG",
  helsinki: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Kirkko3.png",
  riga: "https://upload.wikimedia.org/wikipedia/commons/0/03/House_of_Blackheads_at_Dusk_3%2C_Riga%2C_Latvia_-_Diliff.jpg",
  reikiavik: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Hallgrimskirkja_mai_2026.jpg",
  reykjavik: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Hallgrimskirkja_mai_2026.jpg",
  belgrado: "https://upload.wikimedia.org/wikipedia/commons/7/70/Hram_svetog_save_beograd_0005_%28edited%29.jpg",
  belgrade: "https://upload.wikimedia.org/wikipedia/commons/7/70/Hram_svetog_save_beograd_0005_%28edited%29.jpg",
  bucarest: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Palace_of_the_Parliament_in_Bucharest_%2851878975552%29.jpg",
  bucharest: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Palace_of_the_Parliament_in_Bucharest_%2851878975552%29.jpg",
  liubliana: "https://upload.wikimedia.org/wikipedia/commons/6/67/Ljubljanski_grad_in_Grajski_gri%C4%8D.jpg",
  ljubljana: "https://upload.wikimedia.org/wikipedia/commons/6/67/Ljubljanski_grad_in_Grajski_gri%C4%8D.jpg",
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
