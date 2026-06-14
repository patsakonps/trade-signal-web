import { useEffect, useState } from "react";
import { BellRing, Play, Plus, Send, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import type { IndicatorTemplate, ScannerSummary, SignalRule, TelegramNotificationResponse, TelegramNotificationSetting } from "../lib/types";
import { Badge } from "../components/Badge";

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
      await api.post("/api/notifications/telegram/test", { chatId: setting.chatId || undefined });
      setMessage("Test message sent to Telegram");
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
    setScanSummary(null);
    try {
      const response = await api.post<ScannerSummary>("/api/scanner/run", {});
      setScanSummary(response.data);
      setMessage(`Scanner done: ${response.data.triggered} triggered, ${response.data.telegramSent} Telegram sent`);
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
          <p className="muted">Level 2 alert: Cloud/API scanner ส่งข้อความเข้า Telegram เมื่อ rule เกิดสัญญาณใหม่</p>
        </div>
        <Badge tone={botConfigured ? "green" : "yellow"}>{botConfigured ? (defaultChatIdConfigured ? "BOT + ENV CHAT" : "BOT READY") : "TOKEN MISSING"}</Badge>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="form-grid single-on-mobile">
        <label>
          Telegram Chat ID
          <input
            placeholder={defaultChatIdConfigured ? "ใช้ TELEGRAM_CHAT_ID จาก API .env ได้ ถ้าไม่กรอก" : "เช่น 123456789 หรือ -100xxxxxxxxxx"}
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
          <BellRing size={16} /> {loading ? "Saving" : "Save Telegram"}
        </button>
        <button className="btn" onClick={sendTest} disabled={testing || (!setting.chatId && !defaultChatIdConfigured)}>
          <Send size={16} /> {testing ? "Sending" : "Send Test"}
        </button>
        <button className="btn primary" onClick={runScanner} disabled={scanning}>
          <Play size={16} /> {scanning ? "Scanning" : "Run Scanner Now"}
        </button>
      </div>

      <div className="helper-box">
        <b>วิธีใช้</b>
        <p>สร้าง bot ด้วย @BotFather แล้วใส่ token ใน API .env: <code>TELEGRAM_BOT_TOKEN=...</code> และจะใส่ <code>TELEGRAM_CHAT_ID=...</code> เป็นค่า default ก็ได้ จากนั้นส่งข้อความหา bot 1 ครั้ง แล้วหา chat id จาก Bot API getUpdates หรือจาก bot helper ที่คุณใช้ประจำ</p>
      </div>

      {scanSummary ? (
        <div className="scan-summary">
          <div className="summary-metrics">
            <span>Rules: <b>{scanSummary.scannedRules}</b></span>
            <span>Triggered: <b>{scanSummary.triggered}</b></span>
            <span>Sent: <b>{scanSummary.telegramSent}</b></span>
            <span>Errors: <b>{scanSummary.errors}</b></span>
          </div>
          <div className="signal-list">
            {scanSummary.results.slice(0, 8).map((item) => (
              <div className="signal-card compact-card" key={`${item.ruleId}-${item.status}-${item.signalType ?? "none"}`}>
                <div className={`signal-dot ${item.status === "TRIGGERED" ? "green" : item.status === "ERROR" ? "red" : "neutral"}`} />
                <div className="signal-content">
                  <div className="signal-title-row"><b>{item.ruleName}</b><Badge tone={item.status === "TRIGGERED" ? "green" : item.status === "ERROR" ? "red" : "neutral"}>{item.status}</Badge></div>
                  <span>{item.symbol} · {item.timeframe} · {item.signalType ?? "-"} · {item.message}</span>
                </div>
              </div>
            ))}
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
      <TelegramNotificationPanel />

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
            <label>Timeframe<select value={timeframe} onChange={(event) => setTimeframe(event.target.value)}><option>5m</option><option>15m</option><option>1h</option><option>4h</option><option>1d</option></select></label>
            <label>Indicator<select value={indicatorKey} onChange={(event) => setIndicatorKey(event.target.value)}>{templates.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
            <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>BUY_OR_SELL</option><option>BUY</option><option>SELL</option><option>GREEN</option><option>RED</option><option>YELLOW</option><option>BLUE</option><option>ZONE_CHANGED</option></select></label>
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
