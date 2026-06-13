import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/Badge";

type Holding = {
  asset: string;
  quantity: string;
  avgCost: string;
  price?: string;
  value?: string;
  pnlPercent?: number;
};

export function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await api.get<{ holdings: Holding[] }>("/api/portfolio/holdings");
      setHoldings(response.data.holdings);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page-stack">
      {error ? <div className="alert error">{error}</div> : null}
      <section className="stats-grid">
        <StatCard label="Portfolio Value" value="$18,420.66" sub="mock until real import" tone="blue" />
        <StatCard label="Unrealized PnL" value="+15.71%" sub="sample holdings" tone="positive" />
        <StatCard label="Realized PnL" value="+$470.40" sub="coming from imported trades" tone="positive" />
        <StatCard label="Assets" value={String(holdings.length)} sub="BTC / ETH / SOL" tone="warning" />
      </section>

      <section className="card panel desktop-table-card">
        <div className="panel-head"><h3>Holdings</h3><Badge tone="yellow">Mock phase</Badge></div>
        <table>
          <thead><tr><th>Asset</th><th>Qty</th><th>Avg Cost</th><th>Price</th><th>Value</th><th>PnL</th></tr></thead>
          <tbody>{holdings.map((item) => <tr key={item.asset}><td><b>{item.asset}</b></td><td>{item.quantity}</td><td>${item.avgCost}</td><td>${item.price}</td><td>${item.value}</td><td className="positive">+{item.pnlPercent}%</td></tr>)}</tbody>
        </table>
      </section>

      <div className="mobile-card-list">
        {holdings.map((item) => (
          <div className="card mobile-data-card" key={item.asset}>
            <div><h3>{item.asset}</h3><p>Qty {item.quantity} · Avg ${item.avgCost}</p></div>
            <div className="mobile-card-meta"><Badge tone="green">+{item.pnlPercent}%</Badge><b>${item.value}</b></div>
          </div>
        ))}
      </div>
    </div>
  );
}
