import { useEffect, useState } from "react";
import { BellRing, Play, Plus, Send, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type { IndicatorTemplate, ScannerRuleResult, ScannerSummary, SignalRule, TelegramNotificationResponse, TelegramNotificationSetting } from "../lib/types";
import { Badge } from "../components/Badge";
import { formatThaiDateTime, formatThaiTime } from "../lib/time";
import { chartTimeframes } from "../lib/timeframes";

function getScanStatusTone(status: ScannerRuleResult["status"]): "green" | "red" | "yellow" | "blue" | "neutral" {
  if (status === "TRIGGERED") return "green";
  if (status === "ERROR") return "red";
  if (status === "SKIPPED") return "yellow";
  if (status === "DUPLICATE") return "blue";
  return "neutral";
}

function TelegramNotificationPanel() {
  const [setting, setSetting] = useState<TelegramNotificationSetting>({ chatId: "", enabled: false });
  const [botConfigured, setBotConfigured] = useState(false);
  const [defaultChatIdConfigured, setDefaultChatIdConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [scanSummary, setScanSummary] = useState<ScannerSummary | null>(null);

  async function load() {
    setError("");
    try {
      const response = await api.get<TelegramNotificationResponse>("/api/notifications/telegram");
      setSetting({ chatId: response.data.setting.chatId ?? "", enabled: response.data.setting.enabled });
      setBotConfigured(response.data.botConfigured);
      setDefaultChatIdConfigured(response.data.defaultChatIdConfigured);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await api.put<TelegramNotificationResponse>("/api/notifications/telegram", {
        chatId: setting.chatId || null,
        enabled: setting.enabled
      });
      setSetting({ chatId: response.data.setting.chatId ?? "", enabled: response.data.setting.enabled });
      setBotConfigured(response.data.botConfigured);
      setDefaultChatIdConfigured(response.data.defaultChatIdConfigured);
      setMessage("Saved Telegram notification settings");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      await api.post("/api/notifications/telegram/test", { chatId: setting.chatId || null });
      setMessage("ส่ง Telegram test สำเร็จ");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  }

  async function runScanner() {
    setScanning(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post<ScannerSummary>("/api/scanner/run", {});
      setScanSummary(response.data);
      setMessage(`Scanner done: ${response.data.triggered} triggered, ${response.data.telegramSent} sent, ${response.data.errors} errors`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setScanning(false);
    }
  }

  return (
    <section className="card panel">
      <div className="panel-head responsive-head">
        <div>
          <h3>Telegram Notification</h3>
          <p className="muted">ตั้งค่า chat และกดทดสอบก่อนให้ Cloud Scheduler ยิงจริง</p>
        </div>
        <Badge tone={botConfigured ? "green" : "yellow"}>{botConfigured ? (defaultChatIdConfigured ? "BOT + DEFAULT CHAT" : "BOT READY") : "TOKEN MISSING"}</Badge>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="form-grid single-on-mobile">
        <label>
          Telegram Chat ID
          <input
            placeholder={defaultChatIdConfigured ? "ว่างได้ ถ้าใช้ TELEGRAM_CHAT_ID จาก API" : "เช่น 123456789 หรือ -100xxxxxxxxxx"}
            value={setting.chatId ?? ""}
            onChange={(event) => setSetting((value) => ({ ...value, chatId: event.target.value }))}
          />
        </label>
        <label>
          Status
          <select
            value={setting.enabled ? "ON" : "OFF"}
            onChange={(event) => setSetting((value) => ({ ...value, enabled: event.target.value === "ON" }))}
          >
            <option>ON</option>
            <option>OFF</option>
          </select>
        </label>
      </div>

      <div className="button-row spread-on-mobile">
        <button className="btn" onClick={save} disabled={loading}>
          <BellRing size={16} /> {loading ? "Saving" : "Save"}
        </button>
        <button className="btn" onClick={sendTest} disabled={testing || (!setting.chatId && !defaultChatIdConfigured)}>
          <Send size={16} /> {testing ? "Sending" : "Test"}
        </button>
        <button className="btn primary" onClick={runScanner} disabled={scanning}>
          <Play size={16} /> {scanning ? "Scanning" : "Run Scanner"}
        </button>
      </div>

      <div className="helper-box">
        <b>Checklist</b>
        <p>ใส่ <code>TELEGRAM_BOT_TOKEN</code> ใน API แล้วกด <b>Test</b>. ถ้าผ่าน ค่อยใช้ <b>Run Scanner</b> หรือรอ Cloud Scheduler.</p>
      </div>

      {scanSummary ? (
        <div className="scan-summary">
          <div className="summary-metrics">
            <span>Rules <b>{scanSummary.scannedRules}</b></span>
            <span>Trigger <b>{scanSummary.triggered}</b></span>
            <span>Sent <b>{scanSummary.telegramSent}</b></span>
            <span>Skip <b>{scanSummary.skipped}</b></span>
            <span>Error <b>{scanSummary.errors}</b></span>
          </div>
          <p className="muted">Scanned {formatThaiDateTime(scanSummary.scannedAt)} · {scanSummary.durationMs} ms</p>
          <div className="signal-list">
            {scanSummary.results.map((item) => {
              const tone = getScanStatusTone(item.status);
              return (
                <div className="signal-card compact-card" key={`${item.ruleId}-${item.status}-${item.signalType ?? "none"}-${item.candleCloseTime ?? ""}`}>
                  <div className={`signal-dot ${tone === "neutral" ? "neutral" : tone}`} />
                  <div className="signal-content">
                    <div className="signal-title-row">
                      <b>{item.ruleName}</b>
                      <Badge tone={tone}>{item.status}</Badge>
                    </div>
                    <span>{item.symbol} · {item.timeframe} · {item.signalType ?? "-"} · {item.zone ?? "-"}</span>
                    <span>{item.candleCloseTime ? `ปิดแท่ง ${formatThaiTime(item.candleCloseTime)} · ` : ""}{item.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function SignalRulesPage() {
  const [rules, setRules] = useState<SignalRule[]>([]);
  const [templates, setTemplates] = useState<IndicatorTemplate[]>([]);
  const [name, setName] = useState("BTC CDC 4H");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [indicatorKey, setIndicatorKey] = useState("CDC_ACTION_ZONE");
  const [condition, setCondition] = useState("BUY_OR_SELL");
  const [error, setError] = useState("");
  const [savingRule, setSavingRule] = useState(false);

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
    if (!name.trim()) {
      setError("Rule name is required");
      return;
    }
    if (!symbol.trim()) {
      setError("Symbol is required");
      return;
    }

    setSavingRule(true);
    setError("");
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
    } finally {
      setSavingRule(false);
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
      <TelegramNotificationPanel />

      <section className="content-grid">
        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Create Rule</h3>
              <p className="muted">สร้างเงื่อนไขที่ scanner ต้องแจ้งเตือน</p>
            </div>
            <Badge tone="blue">Rule</Badge>
          </div>
          {error ? <div className="alert error">{error}</div> : null}
          <div className="form-grid single-on-mobile">
            <label>Rule Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Symbol<input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></label>
            <label>Timeframe<select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>{chartTimeframes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Indicator<select value={indicatorKey} onChange={(event) => setIndicatorKey(event.target.value)}>{templates.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
            <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>BUY_OR_SELL</option><option>BUY</option><option>SELL</option><option>GREEN</option><option>RED</option><option>YELLOW</option><option>BLUE</option><option>ZONE_CHANGED</option><option>OVERSOLD</option><option>OVERBOUGHT</option></select></label>
          </div>
          <button className="btn primary full-on-mobile" onClick={createRule} disabled={savingRule}><Plus size={16} /> {savingRule ? "Saving" : "Save Rule"}</button>
        </div>

        <div className="card panel">
          <div className="panel-head">
            <div>
              <h3>Active Rules</h3>
              <p className="muted">เปิด/ปิด rule ที่ scanner ใช้งาน</p>
            </div>
            <button className="btn" onClick={load}>Refresh</button>
          </div>
          <div className="signal-list">
            {rules.map((rule) => (
              <div className="signal-card rule-card" key={rule.id}>
                <div className={`signal-dot ${rule.enabled ? "green" : "neutral"}`} />
                <div className="signal-content rule-card-content">
                  <div className="signal-title-row rule-title-row">
                    <div>
                      <b>{rule.name}</b>
                      <span>{rule.symbol} · {rule.timeframe}</span>
                    </div>
                    <Badge tone={rule.enabled ? "green" : "neutral"}>{rule.enabled ? "ON" : "OFF"}</Badge>
                  </div>
                  <div className="rule-meta-grid">
                    <div><span>Symbol</span><b>{rule.symbol}</b></div>
                    <div><span>TF</span><b>{rule.timeframe}</b></div>
                    <div><span>Indicator</span><b>{rule.indicatorKey}</b></div>
                    <div><span>Condition</span><b>{rule.condition}</b></div>
                  </div>
                </div>
                <div className="rule-card-actions">
                  <button className="btn small" onClick={() => toggleRule(rule)}>{rule.enabled ? "Disable" : "Enable"}</button>
                  <button className="icon-btn danger" onClick={() => deleteRule(rule.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {!rules.length ? <p className="muted">ยังไม่มี rule</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
