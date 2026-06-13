import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type { IndicatorResult, WatchlistItem } from "../lib/types";
import { Badge, toneFromZone } from "../components/Badge";

export function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [zones, setZones] = useState<Record<string, IndicatorResult>>({});
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [error, setError] = useState("");

  async function loadItems() {
    setError("");
    try {
      const response = await api.get<{ items: WatchlistItem[] }>("/api/watchlist");
      setItems(response.data.items);
      response.data.items.forEach((item) => loadZone(item));
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
        <div className="panel-head">
          <h3>Add Watchlist</h3>
          <Badge tone="blue">Binance</Badge>
        </div>
        <div className="inline-form">
          <input placeholder="BTCUSDT" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} />
          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
            <option>15m</option>
            <option>1h</option>
            <option>4h</option>
            <option>1d</option>
          </select>
          <button className="btn primary" onClick={addItem}><Plus size={16} /> Add</button>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
      </div>

      <div className="card panel desktop-table-card">
        <div className="panel-head">
          <h3>Watchlist</h3>
          <button className="btn" onClick={loadItems}>Refresh</button>
        </div>
        <table>
          <thead>
            <tr><th>Symbol</th><th>Timeframe</th><th>Zone</th><th>Signal</th><th>Price</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const result = zones[item.id];
              return (
                <tr key={item.id}>
                  <td><b>{item.symbol}</b></td>
                  <td>{item.timeframe}</td>
                  <td><Badge tone={toneFromZone(result?.latest.zone)}>{result?.latest.zone ?? "..."}</Badge></td>
                  <td><Badge tone={toneFromZone(result?.latest.signal)}>{result?.latest.signal ?? "..."}</Badge></td>
                  <td>{result ? `$${result.latest.price.toLocaleString()}` : "..."}</td>
                  <td><button className="icon-btn danger" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mobile-card-list">
        {items.map((item) => {
          const result = zones[item.id];
          return (
            <div className="card mobile-data-card" key={item.id}>
              <div>
                <h3>{item.symbol}</h3>
                <p>{item.exchange} · {item.timeframe}</p>
              </div>
              <div className="mobile-card-meta">
                <Badge tone={toneFromZone(result?.latest.zone)}>{result?.latest.zone ?? "Loading"}</Badge>
                <Badge tone={toneFromZone(result?.latest.signal)}>{result?.latest.signal ?? "..."}</Badge>
                <button className="icon-btn danger" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
