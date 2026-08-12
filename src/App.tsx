import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { SiteFooter } from "./components/SiteFooter";
import { SearchScreen } from "./screens/SearchScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { MyTripsScreen } from "./screens/MyTripsScreen";
import { TripDetailScreen } from "./screens/TripDetailScreen";
import { DataSourcesScreen } from "./screens/DataSourcesScreen";

function App() {
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
          </Routes>
        </main>
        <SiteFooter />
      </div>
    </BrowserRouter>
  );
}

export default App;
