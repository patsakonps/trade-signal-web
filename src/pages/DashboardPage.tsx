import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type { IndicatorResult, SignalHistoryItem } from "../lib/types";
import { StatCard } from "../components/StatCard";
import { Badge, toneFromZone } from "../components/Badge";
import { MiniChart } from "../components/MiniChart";
import { SignalCard } from "../components/SignalCard";
import { formatThaiDateTime, formatThaiTime, formatTimeAgoThai, isDataStale } from "../lib/time";
import { getTradingViewChartUrl } from "../lib/marketLinks";

function formatPrice(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
}

function getLatestCloseTime(result: IndicatorResult | null): number | undefined {
  return result?.latest.closeTime ?? result?.latest.time;
}

export function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [result, setResult] = useState<IndicatorResult | null>(null);
  const [signals, setSignals] = useState<SignalHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

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

  async function loadSignalHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await api.get<{ signals: SignalHistoryItem[] }>("/api/signals", {
        params: { limit: 12 }
      });
      setSignals(response.data.signals);
    } catch (err) {
      setHistoryError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadCdc();
    loadSignalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = result?.latest;
  const latestSignal = latest?.signal || "-";
  const latestZone = latest?.zone || "-";
  const latestCloseTime = getLatestCloseTime(result);
  const stale = isDataStale(latestCloseTime, timeframe);
  const triggeredAlerts = result?.alerts.filter((alert) => alert.triggered).length ?? 0;

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <StatCard label="Latest Price" value={formatPrice(latest?.price)} sub={`${symbol} · ${timeframe}`} tone="blue" />
        <StatCard label="CDC Zone" value={latestZone} sub={latestCloseTime ? `แท่งปิด ${formatThaiTime(latestCloseTime)}` : "Green / Red / Yellow / Blue"} tone={latestZone === "RED" ? "negative" : latestZone === "YELLOW" ? "warning" : "positive"} />
        <StatCard label="Signal" value={latestSignal} sub={latestCloseTime ? `เกิดจากแท่งปิด ${formatThaiTime(latestCloseTime)}` : "after candle close"} tone={latestSignal === "SELL" ? "negative" : latestSignal === "BUY" ? "positive" : "blue"} />
        <StatCard label="Alerts" value={String(triggeredAlerts)} sub={latestCloseTime ? `ล่าสุด ${formatTimeAgoThai(latestCloseTime)}` : "triggered now"} tone="warning" />
      </section>

      {stale ? (
        <div className="alert warning">ข้อมูลล่าสุดอาจเก่าเกินไป: แท่งล่าสุดปิดเวลา {formatThaiDateTime(latestCloseTime)} เวลาไทย</div>
      ) : null}

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
                <option>5m</option>
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
          <div className="badge-row chart-meta-row">
            <Badge tone={toneFromZone(latestZone)}>ZONE: {latestZone}</Badge>
            <Badge tone={toneFromZone(latestSignal)}>SIGNAL: {latestSignal}</Badge>
            <Badge tone="blue">EMA12/EMA26</Badge>
            {latestCloseTime ? <Badge tone={stale ? "yellow" : "neutral"}>CLOSE: {formatThaiTime(latestCloseTime)}</Badge> : null}
            <a className="btn small" href={getTradingViewChartUrl(symbol)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> TradingView</a>
          </div>
        </div>

        <div className="card panel">
          <div className="panel-head">
            <h3>Latest Signals</h3>
            <Badge tone="blue">Live API</Badge>
          </div>
          <div className="signal-list">
            {result?.alerts.map((alert) => {
              const candleText = latestCloseTime ? formatThaiDateTime(latestCloseTime) : "-";
              const description = alert.triggered
                ? `เกิดสัญญาณเวลา ${candleText} เวลาไทย · ราคา ${formatPrice(latest?.price)}`
                : `ยังไม่เกิดสัญญาณในแท่งล่าสุด · แท่งล่าสุดปิดเวลา ${candleText} เวลาไทย`;

              return (
                <SignalCard
                  key={alert.name}
                  title={`${symbol} · ${alert.name}`}
                  description={description}
                  zone={alert.triggered ? latestSignal : latestZone}
                />
              );
            })}
            {!result ? <p className="muted">กด Run เพื่อดึง CDC signal</p> : null}
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head responsive-head">
          <div>
            <h3>Recent Triggered Signals</h3>
            <p className="muted">ประวัติ signal ที่ scanner บันทึกจริงจาก database เรียงตามเวลาปิดแท่งล่าสุด</p>
          </div>
          <button className="btn" onClick={loadSignalHistory} disabled={historyLoading}>{historyLoading ? "Loading" : "Refresh History"}</button>
        </div>
        {historyError ? <div className="alert error">{historyError}</div> : null}
        <div className="signal-list">
          {signals.map((signal) => (
            <div className="signal-card history-signal-card" key={signal.id}>
              <div className="history-signal-main">
                <div className={`signal-dot ${toneFromZone(signal.signalType)}`} />
                <div className="signal-content">
                  <div className="signal-title-row history-title-row">
                    <b>{signal.symbol} · {signal.signalType}</b>
                    <Badge tone={toneFromZone(signal.signalType)}>{signal.zone ?? signal.signalType}</Badge>
                  </div>
                  <div className="history-meta-grid">
                    <div>
                      <span>Timeframe</span>
                      <b>{signal.timeframe}</b>
                    </div>
                    <div>
                      <span>Rule</span>
                      <b>{signal.rule?.name ?? "Rule deleted"}</b>
                    </div>
                    <div>
                      <span>Price</span>
                      <b>{formatPrice(signal.price)}</b>
                    </div>
                    <div>
                      <span>Candle close</span>
                      <b>{formatThaiDateTime(signal.candleCloseTime)}</b>
                    </div>
                  </div>
                  <span className="history-created-at">บันทึก {formatTimeAgoThai(signal.createdAt)} · เวลาไทย</span>
                </div>
              </div>
              <a className="btn small history-chart-btn" href={getTradingViewChartUrl(signal.symbol)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Chart</a>
            </div>
          ))}
          {!signals.length ? <p className="muted">ยังไม่มี signal history จาก scanner</p> : null}
        </div>
      </section>
    </div>
  );
}
