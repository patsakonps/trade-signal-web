import { useEffect, useState } from "react";
import { BellPlus, ExternalLink, Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type { IndicatorResult, SignalRule, WatchlistItem } from "../lib/types";
import { Badge, toneFromZone } from "../components/Badge";
import { formatThaiTime, formatTimeAgoThai, isDataStale } from "../lib/time";
import { getTradingViewChartUrl } from "../lib/marketLinks";
import { chartTimeframes } from "../lib/timeframes";

function formatPrice(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "...";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
}

function getLatestCloseTime(result?: IndicatorResult): number | undefined {
  return result?.latest.closeTime ?? result?.latest.time;
}

function hasDefaultCdcRule(item: WatchlistItem, rules: SignalRule[]) {
  return rules.some(
    (rule) =>
      rule.symbol === item.symbol &&
      rule.timeframe === item.timeframe &&
      rule.indicatorType === "BUILT_IN" &&
      rule.indicatorKey === "CDC_ACTION_ZONE" &&
      rule.condition === "BUY_OR_SELL"
  );
}

export function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [rules, setRules] = useState<SignalRule[]>([]);
  const [zones, setZones] = useState<Record<string, IndicatorResult>>({});
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creatingRuleId, setCreatingRuleId] = useState<string | null>(null);

  async function loadItems() {
    setError("");
    setMessage("");
    try {
      const [watchlistResponse, rulesResponse] = await Promise.all([
        api.get<{ items: WatchlistItem[] }>("/api/watchlist"),
        api.get<{ rules: SignalRule[] }>("/api/signal-rules")
      ]);
      setItems(watchlistResponse.data.items);
      setRules(rulesResponse.data.rules);
      setZones({});
      watchlistResponse.data.items.forEach((item) => loadZone(item));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function loadZone(item: WatchlistItem) {
    try {
      const response = await api.get<IndicatorResult>("/api/indicators/cdc-action-zone", {
        params: { symbol: item.symbol, timeframe: item.timeframe, limit: 160 }
      });
      setZones((prev) => ({ ...prev, [item.id]: response.data }));
    } catch {
      // keep card usable even when a single symbol fails
    }
  }

  async function addItem() {
    try {
      await api.post("/api/watchlist", { exchange: "BINANCE", symbol, timeframe });
      setSymbol("");
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function createRuleFromItem(item: WatchlistItem) {
    if (hasDefaultCdcRule(item, rules)) {
      setMessage(`${item.symbol} ${item.timeframe} มี CDC BUY_OR_SELL rule อยู่แล้ว`);
      return;
    }

    setCreatingRuleId(item.id);
    setError("");
    setMessage("");
    try {
      await api.post("/api/signal-rules", {
        name: `${item.symbol} CDC ${item.timeframe}`,
        exchange: item.exchange,
        symbol: item.symbol,
        timeframe: item.timeframe,
        indicatorType: "BUILT_IN",
        indicatorKey: "CDC_ACTION_ZONE",
        indicatorTemplateId: null,
        condition: "BUY_OR_SELL",
        enabled: true,
        paramsJson: {}
      });
      setMessage(`สร้าง rule ให้ ${item.symbol} ${item.timeframe} แล้ว`);
      const rulesResponse = await api.get<{ rules: SignalRule[] }>("/api/signal-rules");
      setRules(rulesResponse.data.rules);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingRuleId(null);
    }
  }

  async function removeItem(id: string) {
    try {
      await api.delete(`/api/watchlist/${id}`);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="page-stack">
      <div className="card panel">
        <div className="panel-head responsive-head">
          <div>
            <h3>Add Watchlist</h3>
            <p className="muted">เพิ่มเหรียญที่อยากติดตาม CDC zone</p>
          </div>
          <Badge tone="blue">Binance</Badge>
        </div>
        <div className="inline-form">
          <input placeholder="BTCUSDT" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} />
          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
            {chartTimeframes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button className="btn primary" onClick={addItem}><Plus size={16} /> Add</button>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}
      </div>

      <div className="card panel desktop-table-card wide-table-card">
        <div className="panel-head">
          <div>
            <h3>Watchlist</h3>
            <p className="muted">ดูสถานะล่าสุดและสร้าง rule ได้ทันที</p>
          </div>
          <button className="btn" onClick={loadItems}>Refresh</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>TF</th>
              <th>Zone</th>
              <th>Signal</th>
              <th>Price</th>
              <th>Last candle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const result = zones[item.id];
              const closeTime = getLatestCloseTime(result);
              const stale = isDataStale(closeTime, item.timeframe);
              const ruleExists = hasDefaultCdcRule(item, rules);
              return (
                <tr key={item.id}>
                  <td><b>{item.symbol}</b></td>
                  <td>{item.timeframe}</td>
                  <td><Badge tone={toneFromZone(result?.latest.zone)}>{result?.latest.zone ?? "..."}</Badge></td>
                  <td><Badge tone={toneFromZone(result?.latest.signal)}>{result?.latest.signal ?? "..."}</Badge></td>
                  <td>{formatPrice(result?.latest.price)}</td>
                  <td>
                    {closeTime ? (
                      <div className="table-time-cell">
                        <b>{formatThaiTime(closeTime)}</b>
                        <span>{formatTimeAgoThai(closeTime)}</span>
                        {stale ? <Badge tone="yellow">STALE</Badge> : null}
                      </div>
                    ) : "..."}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn small" onClick={() => createRuleFromItem(item)} disabled={ruleExists || creatingRuleId === item.id}>
                        <BellPlus size={14} /> {ruleExists ? "Rule exists" : creatingRuleId === item.id ? "Creating" : "Create Rule"}
                      </button>
                      <a className="btn small" href={getTradingViewChartUrl(item.symbol)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Chart</a>
                      <button className="icon-btn danger" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-card-list">
        {items.map((item) => {
          const result = zones[item.id];
          const closeTime = getLatestCloseTime(result);
          const stale = isDataStale(closeTime, item.timeframe);
          const ruleExists = hasDefaultCdcRule(item, rules);
          return (
            <div className="card mobile-data-card watchlist-mobile-card" key={item.id}>
              <div>
                <div className="signal-title-row">
                  <h3>{item.symbol}</h3>
                  <Badge tone={toneFromZone(result?.latest.zone)}>{result?.latest.zone ?? "Loading"}</Badge>
                </div>
                <p>{item.exchange} · {item.timeframe} · {formatPrice(result?.latest.price)}</p>
                <div className="history-meta-grid">
                  <div><span>Signal</span><b>{result?.latest.signal ?? "..."}</b></div>
                  <div><span>Close</span><b>{closeTime ? formatThaiTime(closeTime) : "..."}</b></div>
                  <div><span>Fresh</span><b>{closeTime ? formatTimeAgoThai(closeTime) : "..."}</b></div>
                </div>
              </div>
              <div className="mobile-card-meta">
                {stale ? <Badge tone="yellow">STALE</Badge> : null}
                <div className="table-actions mobile-actions">
                  <button className="btn small" onClick={() => createRuleFromItem(item)} disabled={ruleExists || creatingRuleId === item.id}>
                    <BellPlus size={14} /> {ruleExists ? "Exists" : "Rule"}
                  </button>
                  <a className="btn small" href={getTradingViewChartUrl(item.symbol)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Chart</a>
                  <button className="icon-btn danger" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {!items.length ? <p className="muted">ยังไม่มี watchlist</p> : null}
      </div>
    </div>
  );
}
