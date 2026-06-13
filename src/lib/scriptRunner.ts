import type { Candle, IndicatorResult } from "./types";

type RunScriptInput = {
  script: string;
  candles: Candle[];
  params?: Record<string, unknown>;
  symbol: string;
  timeframe: string;
  timeoutMs?: number;
};

const workerSource = `
function toSeries(candles, field) {
  return candles.map((candle) => Number(candle[field]));
}

const helpers = {
  open: (candles) => toSeries(candles, "open"),
  high: (candles) => toSeries(candles, "high"),
  low: (candles) => toSeries(candles, "low"),
  close: (candles) => toSeries(candles, "close"),
  volume: (candles) => toSeries(candles, "volume"),
  ohlc4: (candles) => candles.map((c) => (Number(c.open) + Number(c.high) + Number(c.low) + Number(c.close)) / 4),
  hl2: (candles) => candles.map((c) => (Number(c.high) + Number(c.low)) / 2),
  ema: (values, period) => {
    const safePeriod = Math.max(1, Math.floor(Number(period) || 1));
    const multiplier = 2 / (safePeriod + 1);
    const out = [];
    for (let i = 0; i < values.length; i += 1) {
      const value = Number(values[i]);
      out.push(i === 0 ? value : value * multiplier + out[i - 1] * (1 - multiplier));
    }
    return out;
  },
  sma: (values, period) => {
    const safePeriod = Math.max(1, Math.floor(Number(period) || 1));
    return values.map((_, i) => {
      const start = Math.max(0, i - safePeriod + 1);
      const slice = values.slice(start, i + 1).map(Number);
      return slice.reduce((sum, item) => sum + item, 0) / slice.length;
    });
  },
  crossOver: (a, b, i) => i > 0 && a[i] > b[i] && a[i - 1] <= b[i - 1],
  crossUnder: (a, b, i) => i > 0 && a[i] < b[i] && a[i - 1] >= b[i - 1]
};

function validate(result) {
  if (!result || typeof result !== "object") throw new Error("Script must return an object");
  if (!result.latest || typeof result.latest !== "object") throw new Error("Result must include latest object");
  if (!Array.isArray(result.series)) throw new Error("Result must include series array");
  if (!Array.isArray(result.alerts)) result.alerts = [];
  return result;
}

self.onmessage = async (event) => {
  try {
    const { script, candles, params, symbol, timeframe } = event.data;
    const factory = new Function(script + "\n; return calculate;");
    const calculate = factory();
    if (typeof calculate !== "function") throw new Error("Script must define function calculate(ctx)");
    const result = validate(calculate({ candles, params: params || {}, helpers, symbol, timeframe }));
    result.symbol = result.symbol || symbol;
    result.timeframe = result.timeframe || timeframe;
    result.indicatorKey = result.indicatorKey || "CUSTOM_SCRIPT";
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, message: error && error.message ? error.message : String(error) });
  }
};
`;

export function runCustomIndicatorScript(input: RunScriptInput): Promise<IndicatorResult> {
  const timeoutMs = input.timeoutMs ?? 1800;
  const blob = new Blob([workerSource], { type: "application/javascript" });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error(`Script timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<{ ok: boolean; result?: IndicatorResult; message?: string }>) => {
      window.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);

      if (event.data.ok && event.data.result) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.message || "Script failed"));
      }
    };

    worker.onerror = (error) => {
      window.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error(error.message));
    };

    worker.postMessage(input);
  });
}
