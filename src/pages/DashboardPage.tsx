import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type {
  IndicatorResult,
  IndicatorTemplate,
  SignalHistoryItem,
} from "../lib/types";
import { StatCard } from "../components/StatCard";
import { Badge, toneFromZone } from "../components/Badge";
import { MiniChart } from "../components/MiniChart";
import { SignalCard } from "../components/SignalCard";
import {
  formatThaiDateTime,
  formatThaiTime,
  formatTimeAgoThai,
  isDataStale,
} from "../lib/time";
import { getTradingViewChartUrl } from "../lib/marketLinks";
import { chartTimeframes } from "../lib/timeframes";

function formatPrice(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
}

function formatNumber(value: unknown, maximumFractionDigits = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString(undefined, { maximumFractionDigits });
}

function getOscillatorStateLabel(value: unknown) {
  if (value === "OVERBOUGHT") return "OVERBOUGHT";
  if (value === "OVERSOLD") return "OVERSOLD";
  if (value === "ABOVE_50") return "ABOVE 50";
  if (value === "BELOW_50") return "BELOW 50";
  if (value === "BULLISH") return "BULLISH";
  if (value === "BEARISH") return "BEARISH";
  return "WAITING";
}

function getAlertZone(
  alertName: string,
  triggered: boolean,
  latestSignal?: string,
) {
  if (!triggered) return undefined;
  const normalized = alertName.toLowerCase();
  if (normalized.includes("oversold")) return "OVERSOLD";
  if (normalized.includes("overbought")) return "OVERBOUGHT";
  if (normalized.includes("bullish")) return "BUY";
  if (normalized.includes("bearish")) return "SELL";
  if (normalized.includes("squat")) return "RED";
  return latestSignal;
}

function getAlertDescription(
  triggered: boolean,
  closeTime?: number,
  price?: number,
  oscillator?: { label: string; value: unknown } | null,
) {
  const base = shortSignalDescription(triggered, closeTime, price);
  if (!oscillator || oscillator.value === undefined || oscillator.value === null) return base;
  return `${base} · ${oscillator.label} ${formatNumber(oscillator.value)}`;
}

function getOscillatorToneSource(state: unknown, zone?: string) {
  if (state === "OVERBOUGHT") return "OVERBOUGHT";
  if (state === "OVERSOLD") return "OVERSOLD";
  if (state === "BULLISH") return "GREEN";
  if (state === "BEARISH") return "RED";
  return zone;
}

function getFlowStateLabel(primary: unknown, fallback?: unknown) {
  const first = primary === undefined || primary === null || primary === "NONE" ? fallback : primary;
  if (first === undefined || first === null || first === "") return "WAITING";
  return String(first).replace(/_/g, " ");
}

function getFlowToneSource(indicatorKey: string, latest: IndicatorResult["latest"] | undefined, latestZone?: string) {
  if (indicatorKey === "CVD_TAKER_DELTA") {
    if (latest?.signal === "BUY") return "GREEN";
    if (latest?.signal === "SELL") return "RED";
    if (latest?.values.Direction === "BUYERS") return "GREEN";
    if (latest?.values.Direction === "SELLERS") return "RED";
  }

  if (indicatorKey === "BILL_WILLIAMS_MFI") {
    if (latest?.values.State === "SQUAT") return "RED";
    if (latest?.values.State === "FAKE") return "YELLOW";
    if (latest?.values.State === "FADE") return "BLUE";
    if (latest?.values.State === "GREEN") return "GREEN";
  }

  return latestZone;
}

function getLatestCloseTime(
  result: IndicatorResult | null,
): number | undefined {
  return result?.latest.closeTime ?? result?.latest.time;
}

function shortSignalDescription(
  triggered: boolean,
  closeTime?: number,
  price?: number,
) {
  const closeText = closeTime ? formatThaiTime(closeTime) : "-";
  if (triggered) return `เกิด ${closeText} · ${formatPrice(price)}`;
  return `ยังไม่เกิด · ปิดแท่ง ${closeText}`;
}

export function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [indicatorKey, setIndicatorKey] = useState("CDC_ACTION_ZONE");
  const [templates, setTemplates] = useState<IndicatorTemplate[]>([]);
  const [result, setResult] = useState<IndicatorResult | null>(null);
  const [signals, setSignals] = useState<SignalHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  async function loadIndicator() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<IndicatorResult>(
        `/api/indicators/built-in/${indicatorKey}`,
        {
          params: { symbol, timeframe, limit: 240 },
        },
      );
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
      const response = await api.get<{ signals: SignalHistoryItem[] }>(
        "/api/signals",
        {
          params: { limit: 12 },
        },
      );
      setSignals(response.data.signals);
    } catch (err) {
      setHistoryError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadIndicator();
    loadSignalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await api.get<{ templates: IndicatorTemplate[] }>(
          "/api/indicators/templates",
        );
        setTemplates(
          response.data.templates.filter(
            (item) => item.isBuiltIn || item.type === "BUILT_IN",
          ),
        );
      } catch {
        // Dashboard can still run with the selected default indicator.
      }
    }

    loadTemplates();
  }, []);

  const latest = result?.latest;
  const activeIndicatorKey = result?.indicatorKey ?? indicatorKey;
  const isRsi = activeIndicatorKey === "RSI_14";
  const isAdaptiveRsi = activeIndicatorKey === "ADAPTIVE_RSI_TRIGGER";
  const isCvd = activeIndicatorKey === "CVD_TAKER_DELTA";
  const isBwMfi = activeIndicatorKey === "BILL_WILLIAMS_MFI";
  const isOscillator = isRsi || isAdaptiveRsi;
  const oscillatorLabel = isAdaptiveRsi ? "Adaptive RSI" : "RSI";
  const latestSignal = latest?.signal || "-";
  const latestZone = latest?.zone || "-";
  const latestOscillator = isAdaptiveRsi ? latest?.values.AdaptiveRSI : latest?.values.RSI;
  const latestTrigger = latest?.values.Trigger;
  const latestCvd = latest?.values.CVD;
  const latestDelta = latest?.values.Delta;
  const latestDeltaPercent = latest?.values.DeltaPercent;
  const latestBwMfi = latest?.values.BWMFI;
  const latestBwState = latest?.values.State;
  const latestVolume = latest?.values.Volume;
  const latestSpread = latest?.values.Spread;
  const latestOscillatorState = getOscillatorStateLabel(latest?.values.State);
  const primaryLabel = isOscillator ? oscillatorLabel : isCvd ? "CVD" : isBwMfi ? "BW MFI" : "Price";
  const primaryValue = isOscillator
    ? formatNumber(latestOscillator)
    : isCvd
      ? formatNumber(latestCvd, 0)
      : isBwMfi
        ? formatNumber(latestBwMfi, 10)
        : formatPrice(latest?.price);
  const primarySub = isAdaptiveRsi
    ? `Trigger ${formatNumber(latestTrigger)} · price ${formatPrice(latest?.price)}`
    : isOscillator
      ? `${symbol} · ${timeframe} · price ${formatPrice(latest?.price)}`
      : isCvd
        ? `Delta ${formatNumber(latestDelta, 0)} (${formatNumber(latestDeltaPercent)}%) · price ${formatPrice(latest?.price)}`
        : isBwMfi
          ? `Vol ${formatNumber(latestVolume, 0)} · spread ${formatNumber(latestSpread, 4)}`
          : `${symbol} · ${timeframe}`;
  const stateLabel = isOscillator || isBwMfi ? "State" : isCvd ? "Flow" : "Zone";
  const stateValue = isOscillator
    ? latestOscillatorState
    : isCvd
      ? getFlowStateLabel(latest?.values.Divergence, latest?.values.Direction)
      : isBwMfi
        ? getFlowStateLabel(latestBwState)
        : latestZone;
  const stateToneSource = isOscillator
    ? getOscillatorToneSource(latest?.values.State, latestZone)
    : getFlowToneSource(activeIndicatorKey, latest, latestZone);
  const summaryLabel = isOscillator ? oscillatorLabel : isCvd ? "CVD / Delta" : isBwMfi ? "MFI / Vol" : "Indicator";
  const summaryValue = isAdaptiveRsi
    ? `${formatNumber(latestOscillator)} / ${formatNumber(latestTrigger)}`
    : isOscillator
      ? formatNumber(latestOscillator)
      : isCvd
        ? `${formatNumber(latestCvd, 0)} / ${formatNumber(latestDelta, 0)}`
        : isBwMfi
          ? `${formatNumber(latestBwMfi, 10)} / ${formatNumber(latestVolume, 0)}`
          : indicatorKey;
  const alertMetric = isOscillator
    ? { label: oscillatorLabel, value: latestOscillator }
    : isCvd
      ? { label: "CVD", value: latestCvd }
      : isBwMfi
        ? { label: "BW MFI", value: latestBwMfi }
        : null;
  const latestCloseTime = getLatestCloseTime(result);
  const stale = isDataStale(latestCloseTime, timeframe);
  const triggeredAlerts =
    result?.alerts.filter((alert) => alert.triggered).length ?? 0;

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <StatCard
          label={primaryLabel}
          value={primaryValue}
          sub={primarySub}
          tone="blue"
        />
        <StatCard
          label={stateLabel}
          value={stateValue}
          sub={
            latestCloseTime
              ? `ปิด ${formatThaiTime(latestCloseTime)}`
              : stateLabel === "State"
                ? `${primaryLabel} state`
                : "indicator zone"
          }
          tone={
            latestZone === "RED"
              ? "negative"
              : latestZone === "YELLOW"
                ? "warning"
                : latestZone === "BLUE"
                  ? "blue"
                  : "positive"
          }
        />
        <StatCard
          label="Signal"
          value={latestSignal}
          sub={
            latestCloseTime
              ? `จากแท่ง ${formatThaiTime(latestCloseTime)}`
              : "after close"
          }
          tone={
            latestSignal === "SELL"
              ? "negative"
              : latestSignal === "BUY"
                ? "positive"
                : "blue"
          }
        />
        <StatCard
          label="Alerts"
          value={String(triggeredAlerts)}
          sub={latestCloseTime ? formatTimeAgoThai(latestCloseTime) : "waiting"}
          tone="warning"
        />
      </section>

      {stale ? (
        <div className="alert warning">
          ข้อมูลอาจเก่า: แท่งล่าสุดปิด {formatThaiDateTime(latestCloseTime)}{" "}
          เวลาไทย
        </div>
      ) : null}

      <section className="content-grid">
        <div className="card panel chart-panel">
          <div className="panel-head responsive-head">
            <div>
              <h3>
                {symbol} ·{" "}
                {templates.find((item) => item.key === indicatorKey)?.name ??
                  indicatorKey}
              </h3>
              <p className="muted">
                Server-side built-in · ใช้แท่งที่ปิดแล้วเท่านั้น
              </p>
            </div>
            <div className="inline-form compact">
              <input
                value={symbol}
                onChange={(event) =>
                  setSymbol(event.target.value.toUpperCase())
                }
              />
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value)}
              >
                {chartTimeframes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={indicatorKey}
                onChange={(event) => setIndicatorKey(event.target.value)}
              >
                {(templates.length
                  ? templates
                  : [
                      {
                        key: "CDC_ACTION_ZONE",
                        name: "CDC Action Zone V.2",
                      } as IndicatorTemplate,
                    ]
                ).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                className="btn primary"
                onClick={loadIndicator}
                disabled={loading}
              >
                {loading ? "Loading" : "Run"}
              </button>
            </div>
          </div>
          {error ? <div className="alert error">{error}</div> : null}
          <MiniChart result={result} />
          <div className="chart-summary-grid">
            <div className="chart-summary-item">
              <span>{stateLabel}</span>
              <Badge tone={toneFromZone(stateToneSource)}>{stateValue}</Badge>
            </div>
            <div className="chart-summary-item">
              <span>Signal</span>
              <Badge tone={toneFromZone(latestSignal)}>{latestSignal}</Badge>
            </div>
            <div className="chart-summary-item">
              <span>{summaryLabel}</span>
              <b>{summaryValue}</b>
            </div>
            <div className="chart-summary-item">
              <span>Close</span>
              <b>{latestCloseTime ? formatThaiTime(latestCloseTime) : "-"}</b>
            </div>
            <a
              className="btn small chart-link-btn"
              href={getTradingViewChartUrl(symbol)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} /> TradingView
            </a>
          </div>
        </div>

        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Latest Signals</h3>
              <p className="muted">สถานะจากแท่งล่าสุด</p>
            </div>
            <Badge tone="blue">Live API</Badge>
          </div>
          <div className="signal-list">
            {result?.alerts.map((alert) => (
              <SignalCard
                key={alert.name}
                title={`${symbol} · ${alert.name}`}
                description={getAlertDescription(
                  alert.triggered,
                  latestCloseTime,
                  latest?.price,
                  isOscillator
                    ? { label: oscillatorLabel, value: latestOscillator }
                    : null,
                )}
                zone={getAlertZone(alert.name, alert.triggered, latestSignal)}
              />
            ))}
            {!result ? <p className="muted">กด Run เพื่อดึง signal</p> : null}
          </div>
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head responsive-head">
          <div>
            <h3>Recent Triggered Signals</h3>
            <p className="muted">
              ประวัติที่ scanner บันทึกจริง เรียงตามเวลาปิดแท่ง
            </p>
          </div>
          <button
            className="btn"
            onClick={loadSignalHistory}
            disabled={historyLoading}
          >
            {historyLoading ? "Loading" : "Refresh History"}
          </button>
        </div>
        {historyError ? (
          <div className="alert error">{historyError}</div>
        ) : null}
        <div className="signal-list">
          {signals.map((signal) => (
            <div className="signal-card history-signal-card" key={signal.id}>
              <div className="history-signal-main">
                <div
                  className={`signal-dot ${toneFromZone(signal.signalType)}`}
                />
                <div className="signal-content">
                  <div className="signal-title-row history-title-row">
                    <b>
                      {signal.symbol} · {signal.signalType}
                    </b>
                    <Badge tone={toneFromZone(signal.signalType)}>
                      {signal.zone ?? signal.signalType}
                    </Badge>
                  </div>
                  <div className="history-meta-grid">
                    <div>
                      <span>TF</span>
                      <b>{signal.timeframe}</b>
                    </div>
                    <div>
                      <span>Rule</span>
                      <b>{signal.rule?.name ?? "Deleted"}</b>
                    </div>
                    <div>
                      <span>Price</span>
                      <b>{formatPrice(signal.price)}</b>
                    </div>
                    <div>
                      <span>Close</span>
                      <b>{formatThaiTime(signal.candleCloseTime)}</b>
                    </div>
                  </div>
                  <span className="history-created-at">
                    บันทึก {formatTimeAgoThai(signal.createdAt)} ·{" "}
                    {formatThaiDateTime(signal.candleCloseTime)}
                  </span>
                </div>
              </div>
              <a
                className="btn small history-chart-btn"
                href={getTradingViewChartUrl(signal.symbol)}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} /> Chart
              </a>
            </div>
          ))}
          {!signals.length ? (
            <p className="muted">ยังไม่มี signal history จาก scanner</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
