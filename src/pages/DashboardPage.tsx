import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import type { IndicatorResult } from "../lib/types";
import { StatCard } from "../components/StatCard";
import { Badge, toneFromZone } from "../components/Badge";
import { MiniChart } from "../components/MiniChart";
import { SignalCard } from "../components/SignalCard";

export function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [result, setResult] = useState<IndicatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCdc() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<IndicatorResult>("/api/indicators/cdc-action-zone", {
        params: { symbol, timeframe, limit: 240 }
      });
      setResult(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCdc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = result?.latest;
  const latestSignal = latest?.signal || "-";
  const latestZone = latest?.zone || "-";

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <StatCard label="Latest Price" value={latest ? `$${latest.price.toLocaleString()}` : "-"} sub={`${symbol} · ${timeframe}`} tone="blue" />
        <StatCard label="CDC Zone" value={latestZone} sub="Green / Red / Yellow / Blue" tone={latestZone === "RED" ? "negative" : latestZone === "YELLOW" ? "warning" : "positive"} />
        <StatCard label="Signal" value={latestSignal} sub="after candle close" tone={latestSignal === "SELL" ? "negative" : latestSignal === "BUY" ? "positive" : "blue"} />
        <StatCard label="Alerts" value={String(result?.alerts.filter((alert) => alert.triggered).length ?? 0)} sub="triggered now" tone="warning" />
      </section>

      <section className="content-grid">
        <div className="card panel chart-panel">
          <div className="panel-head responsive-head">
            <div>
              <h3>{symbol} · CDC Action Zone</h3>
              <p className="muted">Default formula: AP EMA(2), Fast EMA(12), Slow EMA(26)</p>
            </div>
            <div className="inline-form compact">
              <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} />
              <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
                <option>15m</option>
                <option>1h</option>
                <option>4h</option>
                <option>1d</option>
              </select>
              <button className="btn primary" onClick={loadCdc} disabled={loading}>{loading ? "Loading" : "Run"}</button>
            </div>
          </div>
          {error ? <div className="alert error">{error}</div> : null}
          <MiniChart result={result} />
          <div className="badge-row">
            <Badge tone={toneFromZone(latestZone)}>ZONE: {latestZone}</Badge>
            <Badge tone={toneFromZone(latestSignal)}>SIGNAL: {latestSignal}</Badge>
            <Badge tone="blue">EMA12/EMA26</Badge>
          </div>
        </div>

        <div className="card panel">
          <div className="panel-head">
            <h3>Latest Signals</h3>
            <Badge tone="blue">Live API</Badge>
          </div>
          <div className="signal-list">
            {result?.alerts.map((alert) => (
              <SignalCard
                key={alert.name}
                title={`${symbol} · ${alert.name}`}
                description={alert.triggered ? alert.message : "ยังไม่เกิดสัญญาณในแท่งล่าสุด"}
                zone={alert.triggered ? latestSignal : latestZone}
              />
            ))}
            {!result ? <p className="muted">กด Run เพื่อดึง CDC signal</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
