import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "../components/Icon";

interface DataSource {
  name: string;
  url: string;
  what: string;
  license: string;
  notice: string;
}

// Atribuciones obligatorias. OpenStreetMap y Overture no se citan por
// cortesía: sus licencias exigen mantener el aviso de autoría allí donde se
// muestran los datos.
const SOURCES: DataSource[] = [
  {
    name: "Overture Maps Foundation",
    url: "https://overturemaps.org/",
    what: "Los lugares que aparecen en los itinerarios: museos, monumentos, playas, parques y mercados, con su nombre y su ubicación reales.",
    license: "CDLA Permissive 2.0 y Apache 2.0, según la fuente de cada dato",
    notice: "© Overture Maps Foundation",
  },
  {
    name: "OpenStreetMap",
    url: "https://www.openstreetmap.org/copyright",
    what: "La base de todo el mapa y las coordenadas de cada ciudad, estas últimas a través del servicio de geocodificación de Geoapify.",
    license: "Open Database License (ODbL)",
    notice: "© OpenStreetMap contributors",
  },
  {
    name: "OpenFreeMap",
    url: "https://openfreemap.org/",
    what: "Sirve las teselas del mapa del itinerario, sin clave ni límites de uso.",
    license: "Proyecto de código abierto (MIT), datos de OpenMapTiles y OpenStreetMap",
    notice: "OpenFreeMap © OpenMapTiles",
  },
  {
    name: "OpenMapTiles",
    url: "https://openmaptiles.org/",
    what: "El esquema y el estilo de las teselas vectoriales que dibuja el mapa.",
    license: "Datos derivados de OpenStreetMap (ODbL)",
    notice: "© OpenMapTiles",
  },
  {
    name: "Geoapify",
    url: "https://www.geoapify.com/",
    what: "Convierte el nombre de un destino en su latitud y longitud.",
    license: "Servicio con datos de OpenStreetMap",
    notice: "Geocodificación por Geoapify",
  },
];

export function DataSourcesScreen() {
  // React Router no salta al ancla por su cuenta en una navegación de
  // cliente: sin esto, una marca que enlaza a /fuentes#simulado dejaría al
  // usuario en lo alto de la página, buscando a mano el apartado que venía a
  // leer. Con `scroll-mt-24` en cada bloque para que no se meta bajo la
  // barra de navegación.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:py-16">
      <h1 className="flex items-center gap-2 font-heading text-3xl font-bold text-ink-900 lg:text-4xl">
        <Icon name="compass" size={28} className="text-sunset-500" />
        Fuentes de datos
      </h1>
      <p className="mt-3 text-ink-700">
        TripPlanner se apoya en datos abiertos. Aquí está de dónde sale cada cosa y bajo qué licencia.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {SOURCES.map((source) => (
          <article key={source.name} className="rounded-2xl border border-ink-200 bg-white p-5">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="font-heading text-lg font-bold text-ink-900 underline-offset-2 hover:underline"
            >
              {source.name}
            </a>
            <p className="mt-2 text-sm text-ink-700">{source.what}</p>
            <dl className="mt-3 flex flex-col gap-1 text-sm">
              <div className="flex gap-2">
                <dt className="font-semibold text-ink-500">Licencia:</dt>
                <dd className="text-ink-700">{source.license}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-ink-500">Atribución:</dt>
                <dd className="text-ink-700">{source.notice}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {/* Cada marca de la aplicación enlaza aquí, a su apartado. Antes se
          explicaban con un atributo `title`, que en un móvil no existe: la
          explicación que escribimos para ser honestos con el dato resultaba
          invisible justo para la mayoría de la gente. */}
      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold text-ink-900">Qué es real y qué es una estimación</h2>
        <p className="mt-2 text-ink-700">
          Somos explícitos con esto porque nos parece lo honesto. Cada dato de la aplicación lleva una marca que dice
          de dónde sale, y aquí está lo que significa cada una.
        </p>

        <dl className="mt-6 flex flex-col gap-6">
          <div id="real" className="scroll-mt-24 rounded-2xl border border-lagoon-600/20 bg-lagoon-50/50 p-5">
            <dt className="flex items-center gap-2 font-heading text-lg font-bold text-lagoon-800">
              <Icon name="check" size={16} />
              Sitio real
            </dt>
            <dd className="mt-2 text-sm text-ink-700">
              El lugar existe y está donde decimos: el nombre y las coordenadas vienen de Overture Maps. Es lo más
              sólido que tiene la aplicación. Ahora bien,{" "}
              <strong>el precio y la duración de la visita siguen siendo estimaciones</strong> calculadas a partir
              del tipo de lugar: un museo suele costar unos 12 € y llevar hora y media, pero no consultamos la
              tarifa concreta de ese museo. Cuando el lugar tiene web oficial, la enlazamos: compruébalo ahí antes
              de ir.
            </dd>
          </div>

          <div id="estimado" className="scroll-mt-24 rounded-2xl border border-ink-500/20 bg-ink-100/50 p-5">
            <dt className="flex items-center gap-2 font-heading text-lg font-bold text-ink-800">
              <Icon name="compass" size={16} />
              Estimado
            </dt>
            <dd className="mt-2 text-sm text-ink-700">
              Un número que calcula la aplicación, sin consultárselo a nadie. Pasa sobre todo con los
              desplazamientos: los tiempos a pie los medimos sobre el callejero real y esos van marcados como
              &laquo;ruta medida&raquo;, pero el transporte público lo estimamos nosotros, porque el servicio de
              rutas que usamos no lo cubre.
            </dd>
          </div>

          <div id="simulado" className="scroll-mt-24 rounded-2xl border border-sunset-600/20 bg-sunset-50/60 p-5">
            <dt className="flex items-center gap-2 font-heading text-lg font-bold text-sunset-800">
              <Icon name="alert" size={16} />
              Simulado
            </dt>
            <dd className="mt-2 text-sm text-ink-700">
              Generado por la aplicación: <strong>no corresponde a ninguna oferta real</strong>. Es el caso de los
              vuelos y los alojamientos, con sus precios, horarios y valoraciones. Sirven para orientar el
              presupuesto y para que el plan tenga forma, nunca para reservar. Los enlaces de reserva te llevan a
              buscar el equivalente de verdad en sitios como Booking o Google Flights.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
