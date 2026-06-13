import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type { IndicatorTemplate, SignalRule } from "../lib/types";
import { Badge } from "../components/Badge";

export function SignalRulesPage() {
  const [rules, setRules] = useState<SignalRule[]>([]);
  const [templates, setTemplates] = useState<IndicatorTemplate[]>([]);
  const [name, setName] = useState("BTC CDC 4H");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [indicatorKey, setIndicatorKey] = useState("CDC_ACTION_ZONE");
  const [condition, setCondition] = useState("BUY_OR_SELL");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [ruleResponse, templateResponse] = await Promise.all([
        api.get<{ rules: SignalRule[] }>("/api/signal-rules"),
        api.get<{ templates: IndicatorTemplate[] }>("/api/indicators/templates")
      ]);
      setRules(ruleResponse.data.rules);
      setTemplates(templateResponse.data.templates);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createRule() {
    const template = templates.find((item) => item.key === indicatorKey);
    if (!template) return;

    try {
      await api.post("/api/signal-rules", {
        name,
        exchange: "BINANCE",
        symbol,
        timeframe,
        indicatorType: template.isBuiltIn || template.type === "BUILT_IN" ? "BUILT_IN" : "CUSTOM_SCRIPT",
        indicatorKey: template.key,
        indicatorTemplateId: template.isBuiltIn || template.type === "BUILT_IN" ? null : template.id,
        condition,
        enabled: true,
        paramsJson: template.paramsJson ?? {}
      });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleRule(rule: SignalRule) {
    try {
      await api.patch(`/api/signal-rules/${rule.id}`, { enabled: !rule.enabled });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteRule(id: string) {
    try {
      await api.delete(`/api/signal-rules/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <section className="content-grid">
        <div className="card panel">
          <div className="panel-head">
            <h3>Create Rule</h3>
            <Badge tone="blue">Built-in / Custom</Badge>
          </div>
          {error ? <div className="alert error">{error}</div> : null}
          <div className="form-grid single-on-mobile">
            <label>Rule Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Symbol<input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></label>
            <label>Timeframe<select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}><option>15m</option><option>1h</option><option>4h</option><option>1d</option></select></label>
            <label>Indicator<select value={indicatorKey} onChange={(event) => setIndicatorKey(event.target.value)}>{templates.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
            <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>BUY_OR_SELL</option><option>BUY</option><option>SELL</option><option>GREEN</option><option>RED</option><option>ZONE_CHANGED</option></select></label>
          </div>
          <button className="btn primary full-on-mobile" onClick={createRule}><Plus size={16} /> Save Rule</button>
        </div>

        <div className="card panel">
          <div className="panel-head"><h3>Active Rules</h3><button className="btn" onClick={load}>Refresh</button></div>
          <div className="signal-list">
            {rules.map((rule) => (
              <div className="signal-card" key={rule.id}>
                <div className={`signal-dot ${rule.enabled ? "green" : "neutral"}`} />
                <div className="signal-content">
                  <div className="signal-title-row"><b>{rule.name}</b><Badge tone={rule.enabled ? "green" : "neutral"}>{rule.enabled ? "ON" : "OFF"}</Badge></div>
                  <span>{rule.symbol} · {rule.timeframe} · {rule.indicatorKey} · {rule.condition}</span>
                </div>
                <button className="btn small" onClick={() => toggleRule(rule)}>{rule.enabled ? "Disable" : "Enable"}</button>
                <button className="icon-btn danger" onClick={() => deleteRule(rule.id)}><Trash2 size={16} /></button>
              </div>
            ))}
            {!rules.length ? <p className="muted">ยังไม่มี rule</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
