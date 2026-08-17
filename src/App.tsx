import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { SiteFooter } from "./components/SiteFooter";
import { SearchScreen } from "./screens/SearchScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { MyTripsScreen } from "./screens/MyTripsScreen";
import { TripDetailScreen } from "./screens/TripDetailScreen";
import { DataSourcesScreen } from "./screens/DataSourcesScreen";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { CookieBanner } from "./components/CookieBanner";
import { initAnalytics } from "./services/analytics";

function App() {
  // Solo carga PostHog si ya había consentimiento de una visita anterior;
  // si no, se queda esperando a que el usuario decida.
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <BrowserRouter>
      <div className="relative flex min-h-svh flex-col bg-sunset-50">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<SearchScreen />} />
            <Route path="/results" element={<ResultsScreen />} />
            <Route path="/mis-viajes" element={<MyTripsScreen />} />
            <Route path="/mis-viajes/:tripId" element={<TripDetailScreen />} />
            <Route path="/fuentes" element={<DataSourcesScreen />} />
            <Route path="/privacidad" element={<PrivacyScreen />} />
          </Routes>
        </main>
        <SiteFooter />
        <CookieBanner />
      </div>
    </BrowserRouter>
  );
}

export default App;
