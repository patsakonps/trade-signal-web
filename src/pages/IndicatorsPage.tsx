import { useEffect, useMemo, useState } from "react";
import { Copy, Play, Save, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type { Candle, IndicatorResult, IndicatorTemplate } from "../lib/types";
import { defaultCustomCdcScript } from "../lib/defaultCustomCdcScript";
import { runCustomIndicatorScript } from "../lib/scriptRunner";
import { Badge, toneFromZone } from "../components/Badge";

export function IndicatorsPage() {
  const [templates, setTemplates] = useState<IndicatorTemplate[]>([]);
  const [name, setName] = useState("My Custom CDC");
  const [key, setKey] = useState("MY_CUSTOM_CDC");
  const [script, setScript] = useState(defaultCustomCdcScript);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [preview, setPreview] = useState<IndicatorResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const customTemplates = useMemo(() => templates.filter((item) => !item.isBuiltIn && item.type === "CUSTOM_SCRIPT"), [templates]);
  const builtIns = useMemo(() => templates.filter((item) => item.isBuiltIn || item.type === "BUILT_IN"), [templates]);

  async function loadTemplates() {
    setError("");
    try {
      const response = await api.get<{ templates: IndicatorTemplate[] }>("/api/indicators/templates");
      setTemplates(response.data.templates);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function duplicateCdc() {
    setName("Custom CDC Action Zone");
    setKey(`CUSTOM_CDC_${Date.now().toString().slice(-4)}`);
    setScript(defaultCustomCdcScript);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function testScript() {
    setBusy(true);
    setError("");
    setPreview(null);
    try {
      const candleResponse = await api.get<{ candles: Candle[] }>(`/api/market/${symbol}/candles`, {
        params: { timeframe, limit: 240 }
      });
      const result = await runCustomIndicatorScript({
        script,
        candles: candleResponse.data.candles,
        params: { apPeriod: 2, shortPeriod: 12, longPeriod: 26 },
        symbol,
        timeframe
      });
      setPreview(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    setBusy(true);
    setError("");
    try {
      await api.post("/api/indicators/templates", {
        name,
        key: key.toUpperCase().replaceAll(" ", "_"),
        script,
        paramsJson: { apPeriod: 2, shortPeriod: 12, longPeriod: 26 },
        enabled: true
      });
      await loadTemplates();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(template: IndicatorTemplate) {
    if (!window.confirm(`Delete ${template.name}?`)) return;
    try {
      await api.delete(`/api/indicators/templates/${template.id}`);
      await loadTemplates();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="page-stack">
      {error ? <div className="alert error">{error}</div> : null}

      <section className="content-grid">
        <div className="card panel">
          <div className="panel-head">
            <h3>Built-in Indicators</h3>
            <Badge tone="green">Safe server-side</Badge>
          </div>
          {builtIns.map((indicator) => (
            <div className="indicator-card" key={indicator.key}>
              <div>
                <h3>{indicator.name}</h3>
                <p>{indicator.description}</p>
                <div className="badge-row"><Badge tone="green">BUILT-IN</Badge><Badge tone="blue">CDC</Badge></div>
              </div>
              <button className="btn" onClick={duplicateCdc}><Copy size={16} /> Duplicate as Custom</button>
            </div>
          ))}
        </div>

        <div className="card panel">
          <div className="panel-head">
            <h3>Custom Indicators</h3>
            <Badge tone="yellow">Client-side script</Badge>
          </div>
          <div className="signal-list">
            {customTemplates.map((template) => (
              <div className="signal-card" key={template.id}>
                <div className="signal-dot blue" />
                <div className="signal-content">
                  <div className="signal-title-row"><b>{template.name}</b><Badge tone="blue">{template.key}</Badge></div>
                  <span>Saved custom JavaScript formula</span>
                </div>
                <button className="icon-btn danger" onClick={() => deleteTemplate(template)}><Trash2 size={16} /></button>
              </div>
            ))}
            {!customTemplates.length ? <p className="muted">ยังไม่มี custom indicator</p> : null}
          </div>
        </div>
      </section>

      <section className="card panel editor-panel">
        <div className="panel-head responsive-head">
          <div>
            <h3>Custom Script Editor</h3>
            <p className="muted">MVP run script ใน Web Worker ฝั่ง browser ก่อน ไม่ run บน backend</p>
          </div>
          <div className="inline-form compact">
            <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} />
            <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>
              <option>5m</option><option>15m</option><option>1h</option><option>4h</option><option>1d</option>
            </select>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Key
            <input value={key} onChange={(event) => setKey(event.target.value.toUpperCase().replaceAll(" ", "_"))} />
          </label>
        </div>

        <label className="script-label">
          Script
          <textarea className="code-editor" value={script} onChange={(event) => setScript(event.target.value)} spellCheck={false} />
        </label>

        <div className="button-row">
          <button className="btn" onClick={testScript} disabled={busy}><Play size={16} /> Test Script</button>
          <button className="btn primary" onClick={saveTemplate} disabled={busy}><Save size={16} /> Save Indicator</button>
        </div>

        {preview ? (
          <div className="preview-card">
            <div>
              <span className="muted">Preview result</span>
              <h3>{symbol} · {preview.latest.signal}</h3>
              <p>Zone: {preview.latest.zone} · Price: ${preview.latest.price.toLocaleString()}</p>
            </div>
            <div className="badge-row">
              <Badge tone={toneFromZone(preview.latest.zone)}>{preview.latest.zone}</Badge>
              <Badge tone={toneFromZone(preview.latest.signal)}>{preview.latest.signal}</Badge>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
