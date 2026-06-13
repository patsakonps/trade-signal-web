export type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type IndicatorSeriesPoint = {
  time: number;
  price: number;
  zone?: string;
  signal?: string;
  color?: string;
  values: Record<string, number | string | boolean | null>;
};

export type IndicatorResult = {
  indicatorKey: string;
  symbol: string;
  timeframe: string;
  latest: IndicatorSeriesPoint;
  series: IndicatorSeriesPoint[];
  alerts: Array<{ name: string; triggered: boolean; message: string }>;
};

export type WatchlistItem = {
  id: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  createdAt: string;
};

export type IndicatorTemplate = {
  id: string;
  name: string;
  key: string;
  type: "BUILT_IN" | "CUSTOM_SCRIPT";
  script?: string | null;
  paramsJson?: Record<string, unknown>;
  isBuiltIn?: boolean;
  enabled: boolean;
  description?: string;
  createdAt?: string;
};

export type SignalRule = {
  id: string;
  name: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  indicatorType: "BUILT_IN" | "CUSTOM_SCRIPT";
  indicatorKey: string;
  indicatorTemplateId?: string | null;
  condition: string;
  enabled: boolean;
  paramsJson?: Record<string, unknown>;
  indicatorTemplate?: IndicatorTemplate | null;
};
