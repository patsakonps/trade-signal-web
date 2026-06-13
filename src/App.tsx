import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { SignalRulesPage } from "./pages/SignalRulesPage";
import { IndicatorsPage } from "./pages/IndicatorsPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { ImportPage } from "./pages/ImportPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/rules" element={<SignalRulesPage />} />
        <Route path="/indicators" element={<IndicatorsPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
