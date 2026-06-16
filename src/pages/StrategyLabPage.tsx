import { useEffect, useMemo, useState } from "react";
import { BarChart3, FlaskConical, GitCompareArrows, RefreshCw, Trophy } from "lucide-react";
import { Badge } from "../components/Badge";
import { api, getErrorMessage } from "../lib/api";
import { formatThaiDateTime } from "../lib/time";
import type { BacktestRun, SignalRule } from "../lib/types";

type StrategyConfig = {
  ruleId: string;
  candlesLimit: number;
  initialCapital: number;
  positionSizePct: number;
  feePct: number;
  slippagePct: number;
  stopLossPct: string;
  takeProfitPct: string;
  tradeMode: "LONG_ONLY" | "LONG_SHORT";
};

type CompareResponse = {
  runs: BacktestRun[];
  errors: Array<{ ruleId: string; ruleName: string; message: string }>;
};

const defaultConfig: StrategyConfig = {
  ruleId: "",
  candlesLimit: 500,
  initialCapital: 10000,
  positionSizePct: 20,
  feePct: 0.1,
  slippagePct: 0.05,
  stopLossPct: "",
  takeProfitPct: "",
  tradeMode: "LONG_ONLY"
};

function formatPct(value: number, digits = 2) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}%`;
}

function formatUsd(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function metricTone(value: number): "green" | "red" | "neutral" {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return "neutral";
}

function toPayload(config: StrategyConfig) {
  return {
    ...config,
    stopLossPct: config.stopLossPct === "" ? undefined : Number(config.stopLossPct),
    takeProfitPct: config.takeProfitPct === "" ? undefined : Number(config.takeProfitPct)
  };
}

function getRuleLabel(rule: Pick<SignalRule, "name" | "symbol" | "timeframe" | "indicatorKey" | "condition">) {
  return `${rule.name} · ${rule.symbol} ${rule.timeframe} · ${rule.indicatorKey} / ${rule.condition}`;
}

function EquityCurve({ run }: { run: BacktestRun }) {
  const points = run.configJson?.equityCurve ?? [];
  if (points.length < 2) return <div className="chart-empty strategy-chart-empty">ยังไม่มี equity curve</div>;

  const width = 720;
  const height = 230;
  const padding = 18;
  const equities = points.map((item) => item.equity);
  const min = Math.min(...equities);
  const max = Math.max(...equities);
  const range = max - min || 1;
  const path = points.map((item, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((item.equity - min) / range) * (height - padding * 2);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <div className="strategy-chart-card">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Backtest equity curve">
        <line className="grid-line" x1={padding} x2={width - padding} y1={padding} y2={padding} />
        <line className="grid-line" x1={padding} x2={width - padding} y1={height / 2} y2={height / 2} />
        <line className="grid-line" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <path className="equity-line" d={path} />
        <text className="strategy-chart-label" x={padding} y={padding + 12}>{formatUsd(max)}</text>
        <text className="strategy-chart-label" x={padding} y={height - padding - 6}>{formatUsd(min)}</text>
      </svg>
    </div>
  );
}

function RunSummaryCard({ run, rank }: { run: BacktestRun; rank?: number }) {
  const ruleName = run.rule?.name ?? run.ruleId;
  const tradeMode = run.configJson?.tradeMode ?? "LONG_ONLY";
  return (
    <div className="card strategy-run-card">
      <div className="strategy-run-head">
        <div>
          <div className="strategy-rank-row">
            {rank ? <Badge tone={rank === 1 ? "green" : "blue"}>#{rank}</Badge> : null}
            <h3>{ruleName}</h3>
          </div>
          <p className="muted">{run.symbol} · {run.timeframe} · {tradeMode} · {run.totalTrades} trades</p>
        </div>
        <Badge tone={metricTone(run.netProfitPct)}>{formatPct(run.netProfitPct)}</Badge>
      </div>
      <div className="strategy-metric-grid">
        <div><span>Score</span><b>{run.score.toFixed(1)}</b></div>
        <div><span>Winrate</span><b>{run.winrate.toFixed(1)}%</b></div>
        <div><span>Profit Factor</span><b>{run.profitFactor >= 999 ? "∞" : run.profitFactor.toFixed(2)}</b></div>
        <div><span>Max DD</span><b className="negative">-{run.maxDrawdownPct.toFixed(1)}%</b></div>
        <div><span>Final</span><b>{formatUsd(run.finalCapital)}</b></div>
        <div><span>Expectancy</span><b className={run.expectancyPct >= 0 ? "positive" : "negative"}>{formatPct(run.expectancyPct)}</b></div>
      </div>
      <p className="muted">Run {formatThaiDateTime(run.createdAt)} · Signals {run.configJson?.signalsCount ?? "-"} · Candles {run.configJson?.candleCount ?? "-"}</p>
    </div>
  );
}

export function StrategyLabPage() {
  const [rules, setRules] = useState<SignalRule[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [latestRun, setLatestRun] = useState<BacktestRun | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<StrategyConfig>(defaultConfig);

  const builtInRules = useMemo(() => rules.filter((rule) => rule.indicatorType === "BUILT_IN"), [rules]);
  const rankedRuns = useMemo(() => [...runs].sort((left, right) => right.score - left.score || right.netProfitPct - left.netProfitPct), [runs]);

  async function load() {
    setErrors([]);
    try {
      const [ruleResponse, runResponse] = await Promise.all([
        api.get<{ rules: SignalRule[] }>("/api/signal-rules"),
        api.get<{ runs: BacktestRun[] }>("/api/strategy-lab/runs?limit=30")
      ]);
      setRules(ruleResponse.data.rules);
      setRuns(runResponse.data.runs);
      setConfig((current) => ({ ...current, ruleId: current.ruleId || ruleResponse.data.rules.find((rule) => rule.indicatorType === "BUILT_IN")?.id || "" }));
    } catch (err) {
      setErrors([getErrorMessage(err)]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runBacktest() {
    if (!config.ruleId) {
      setErrors(["ยังไม่มี built-in rule ให้ทดสอบ"]);
      return;
    }
    setLoading(true);
    setMessage("");
    setErrors([]);
    try {
      const response = await api.post<{ run: BacktestRun }>("/api/strategy-lab/backtest", toPayload(config));
      setLatestRun(response.data.run);
      setRuns((current) => [response.data.run, ...current.filter((item) => item.id !== response.data.run.id)]);
      setMessage("Backtest สำเร็จ บันทึกผลเข้า Strategy Lab แล้ว");
    } catch (err) {
      setErrors([getErrorMessage(err)]);
    } finally {
      setLoading(false);
    }
  }

  async function compareRules() {
    setLoading(true);
    setMessage("");
    setErrors([]);
    try {
      const response = await api.post<CompareResponse>("/api/strategy-lab/compare", toPayload(config));
      setRuns((current) => {
        const incomingIds = new Set(response.data.runs.map((item) => item.id));
        return [...response.data.runs, ...current.filter((item) => !incomingIds.has(item.id))];
      });
      setLatestRun(response.data.runs[0] ?? null);
      setMessage(`Compare สำเร็จ ${response.data.runs.length} rules${response.data.errors.length ? `, มี error ${response.data.errors.length} rules` : ""}`);
      setErrors(response.data.errors.map((item) => `${item.ruleName}: ${item.message}`));
    } catch (err) {
      setErrors([getErrorMessage(err)]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="card panel strategy-hero">
        <div className="panel-head responsive-head">
          <div>
            <h3>Strategy Lab</h3>
            <p className="muted">จำลองพอร์ตจาก rule จริง เพื่อดูว่า rule ไหนทำเงินจริงหลังหัก fee/slippage ไม่ใช่ดูแค่สัญญาณ</p>
          </div>
          <Badge tone="blue">Backtest MVP</Badge>
        </div>
        <div className="strategy-note-grid">
          <div><b>Entry</b><span>ใช้สัญญาณจากแท่งที่ปิดแล้ว และเข้าไม้ที่ราคา open ของแท่งถัดไป</span></div>
          <div><b>Exit</b><span>ออกเมื่อเจอสัญญาณฝั่งตรงข้าม หรือโดน SL/TP ถ้ากำหนดไว้</span></div>
          <div><b>Rank</b><span>คะแนนรวมจาก profit, winrate, profit factor, drawdown และจำนวน trade</span></div>
        </div>
      </section>

      <section className="content-grid strategy-grid">
        <div className="card panel">
          <div className="panel-head responsive-head">
            <div>
              <h3>Run Backtest</h3>
              <p className="muted">เริ่มจาก 500 candles ก่อน จะเร็วและพอดีกับ Binance limit ปัจจุบัน</p>
            </div>
            <button className="btn" onClick={load}><RefreshCw size={16} /> Refresh</button>
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {errors.map((item) => <div className="alert error" key={item}>{item}</div>)}

          <div className="form-grid single-on-mobile">
            <label>
              Rule
              <select value={config.ruleId} onChange={(event) => setConfig((value) => ({ ...value, ruleId: event.target.value }))}>
                {builtInRules.map((rule) => <option key={rule.id} value={rule.id}>{getRuleLabel(rule)}</option>)}
              </select>
            </label>
            <label>
              Mode
              <select value={config.tradeMode} onChange={(event) => setConfig((value) => ({ ...value, tradeMode: event.target.value as StrategyConfig["tradeMode"] }))}>
                <option value="LONG_ONLY">LONG_ONLY / spot style</option>
                <option value="LONG_SHORT">LONG_SHORT / futures style</option>
              </select>
            </label>
            <label>Candles<input type="number" min={80} max={1000} value={config.candlesLimit} onChange={(event) => setConfig((value) => ({ ...value, candlesLimit: Number(event.target.value) }))} /></label>
            <label>Initial Capital<input type="number" min={100} value={config.initialCapital} onChange={(event) => setConfig((value) => ({ ...value, initialCapital: Number(event.target.value) }))} /></label>
            <label>Position Size %<input type="number" min={1} max={100} value={config.positionSizePct} onChange={(event) => setConfig((value) => ({ ...value, positionSizePct: Number(event.target.value) }))} /></label>
            <label>Fee %<input type="number" min={0} step="0.01" value={config.feePct} onChange={(event) => setConfig((value) => ({ ...value, feePct: Number(event.target.value) }))} /></label>
            <label>Slippage %<input type="number" min={0} step="0.01" value={config.slippagePct} onChange={(event) => setConfig((value) => ({ ...value, slippagePct: Number(event.target.value) }))} /></label>
            <label>Stop Loss %<input type="number" min={0} step="0.1" placeholder="optional" value={config.stopLossPct} onChange={(event) => setConfig((value) => ({ ...value, stopLossPct: event.target.value }))} /></label>
            <label>Take Profit %<input type="number" min={0} step="0.1" placeholder="optional" value={config.takeProfitPct} onChange={(event) => setConfig((value) => ({ ...value, takeProfitPct: event.target.value }))} /></label>
          </div>

          <div className="button-row spread-on-mobile">
            <button className="btn primary" onClick={runBacktest} disabled={loading || !builtInRules.length}>
              <FlaskConical size={16} /> {loading ? "Running" : "Run Selected"}
            </button>
            <button className="btn" onClick={compareRules} disabled={loading || !builtInRules.length}>
              <GitCompareArrows size={16} /> Compare Enabled Rules
            </button>
          </div>
        </div>

        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Latest Result</h3>
              <p className="muted">ผลล่าสุดพร้อม equity curve</p>
            </div>
            <Badge tone={latestRun ? metricTone(latestRun.netProfitPct) : "neutral"}>{latestRun ? formatPct(latestRun.netProfitPct) : "WAITING"}</Badge>
          </div>
          {latestRun ? (
            <>
              <RunSummaryCard run={latestRun} />
              <EquityCurve run={latestRun} />
            </>
          ) : (
            <div className="chart-empty strategy-chart-empty">กด Run Selected หรือ Compare Enabled Rules</div>
          )}
        </div>
      </section>

      <section className="card panel">
        <div className="panel-head responsive-head">
          <div>
            <h3>Rule Ranking</h3>
            <p className="muted">เรียงด้วย score ก่อน แล้วค่อยดู net profit / drawdown ประกอบ</p>
          </div>
          <Badge tone="green"><Trophy size={13} /> Top {Math.min(rankedRuns.length, 30)}</Badge>
        </div>

        <div className="wide-table-card desktop-table-card">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Rule</th>
                <th>Symbol</th>
                <th>Score</th>
                <th>Net</th>
                <th>Winrate</th>
                <th>PF</th>
                <th>Max DD</th>
                <th>Trades</th>
                <th>Run</th>
              </tr>
            </thead>
            <tbody>
              {rankedRuns.map((run, index) => (
                <tr key={run.id}>
                  <td><Badge tone={index === 0 ? "green" : "blue"}>#{index + 1}</Badge></td>
                  <td><b>{run.rule?.name ?? run.ruleId}</b><br /><span className="muted">{run.rule?.indicatorKey} / {run.rule?.condition}</span></td>
                  <td>{run.symbol} · {run.timeframe}</td>
                  <td><b>{run.score.toFixed(1)}</b></td>
                  <td className={run.netProfitPct >= 0 ? "positive" : "negative"}>{formatPct(run.netProfitPct)}</td>
                  <td>{run.winrate.toFixed(1)}%</td>
                  <td>{run.profitFactor >= 999 ? "∞" : run.profitFactor.toFixed(2)}</td>
                  <td className="negative">-{run.maxDrawdownPct.toFixed(1)}%</td>
                  <td>{run.totalTrades}</td>
                  <td>{formatThaiDateTime(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-card-list">
          {rankedRuns.map((run, index) => <RunSummaryCard key={run.id} run={run} rank={index + 1} />)}
        </div>

        {!rankedRuns.length ? <p className="muted">ยังไม่มีผล backtest</p> : null}
      </section>

      <section className="card panel">
        <div className="panel-head">
          <div>
            <h3>Trade History From Latest Run</h3>
            <p className="muted">ดูไม้ที่เปิด/ปิดจาก simulation ล่าสุด</p>
          </div>
          <Badge tone="blue"><BarChart3 size={13} /> Trades</Badge>
        </div>
        {latestRun?.trades?.length ? (
          <>
            <div className="wide-table-card desktop-table-card">
              <table>
                <thead><tr><th>Side</th><th>Entry</th><th>Exit</th><th>PnL</th><th>Reason</th></tr></thead>
                <tbody>
                  {latestRun.trades.slice(0, 30).map((trade) => (
                    <tr key={trade.id}>
                      <td><Badge tone={trade.side === "LONG" ? "green" : "red"}>{trade.side}</Badge></td>
                      <td>{formatThaiDateTime(trade.entryTime)}<br /><b>{trade.entryPrice}</b></td>
                      <td>{formatThaiDateTime(trade.exitTime)}<br /><b>{trade.exitPrice}</b></td>
                      <td className={trade.pnl >= 0 ? "positive" : "negative"}>{formatUsd(trade.pnl)} · {formatPct(trade.pnlPct)}</td>
                      <td>{trade.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-card-list">
              {latestRun.trades.slice(0, 30).map((trade) => (
                <div className="card mobile-data-card" key={trade.id}>
                  <div>
                    <h3>{trade.side} · {trade.reason}</h3>
                    <p>{formatThaiDateTime(trade.entryTime)} → {formatThaiDateTime(trade.exitTime)}</p>
                    <p>Entry {trade.entryPrice} · Exit {trade.exitPrice}</p>
                  </div>
                  <div className="mobile-card-meta">
                    <Badge tone={trade.pnl >= 0 ? "green" : "red"}>{formatPct(trade.pnlPct)}</Badge>
                    <b className={trade.pnl >= 0 ? "positive" : "negative"}>{formatUsd(trade.pnl)}</b>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : <p className="muted">ยังไม่มี trade history จากรอบล่าสุด</p>}
      </section>
    </div>
  );
}
