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
    what: "Las coordenadas de cada ciudad, a través del servicio de geocodificación de Geoapify.",
    license: "Open Database License (ODbL)",
    notice: "© OpenStreetMap contributors",
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

      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold text-ink-900">Qué es real y qué es una estimación</h2>
        <p className="mt-2 text-ink-700">
          Somos explícitos con esto porque nos parece lo honesto. El nombre y la ubicación de los lugares que ves
          son datos reales. En cambio, <strong>los precios, las duraciones y los horarios son estimaciones</strong>{" "}
          calculadas a partir del tipo de lugar: un museo suele costar unos 12 € y llevar hora y media, pero no
          consultamos la tarifa concreta de ese museo. Los vuelos y alojamientos que se muestran son simulados y
          sirven para orientar el presupuesto, no para reservar.
        </p>
        <p className="mt-3 text-ink-700">
          Comprueba siempre precios y horarios en la web oficial del lugar antes de ir.
        </p>
      </section>
    </div>
  );
}
