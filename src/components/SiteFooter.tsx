import { Link } from "react-router-dom";

// Pie global. Nace por una obligación concreta —atribuir a OpenStreetMap y a
// Overture Maps, ver /fuentes— y aloja también la privacidad. Falta el aviso
// de enlaces de afiliación, que llega con el Paso 6.
export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-sunset-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} TripPlanner</p>
        <nav className="-my-2 flex flex-wrap items-center gap-x-5">
          <Link to="/fuentes" className="inline-flex min-h-[44px] items-center font-semibold text-ink-700 underline-offset-2 hover:underline">
            Fuentes de datos
          </Link>
          <Link to="/privacidad" className="inline-flex min-h-[44px] items-center font-semibold text-ink-700 underline-offset-2 hover:underline">
            Privacidad y cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
