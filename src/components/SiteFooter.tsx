import { Link } from "react-router-dom";

// Pie global. Nace por una obligación concreta —atribuir a OpenStreetMap y a
// Overture Maps, ver /fuentes— pero es también donde irán los avisos que
// quedan pendientes: enlaces de afiliación (Paso 6) y cookies (Paso 7).
export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-sunset-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} TripPlanner</p>
        <Link to="/fuentes" className="font-semibold text-ink-700 underline-offset-2 hover:underline">
          Fuentes de datos y avisos legales
        </Link>
      </div>
    </footer>
  );
}
