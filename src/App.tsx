import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { SignalRulesPage } from "./pages/SignalRulesPage";
import { IndicatorsPage } from "./pages/IndicatorsPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { StrategyLabPage } from "./pages/StrategyLabPage";
import { ImportPage } from "./pages/ImportPage";
import { WorkspaceLoginPage } from "./pages/WorkspaceLoginPage";
import { getStoredWorkspaceId } from "./lib/workspace";

export default function App() {
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(() => getStoredWorkspaceId());

  if (!workspaceId) {
    return <WorkspaceLoginPage onLogin={setWorkspaceIdState} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout workspaceId={workspaceId} onWorkspaceChanged={setWorkspaceIdState} />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/rules" element={<SignalRulesPage />} />
        <Route path="/indicators" element={<IndicatorsPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/strategy-lab" element={<StrategyLabPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
