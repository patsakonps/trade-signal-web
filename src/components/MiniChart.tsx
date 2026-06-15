import type { IndicatorResult } from "../lib/types";

type MiniChartProps = {
  result?: IndicatorResult | null;
};

type ChartPoint = { x: number; y: number; value?: number };

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function adaptiveRsiRainbowColor(value: number): string {
  const normalized = clamp(value, 0, 100) / 100;

  // Own gradient: hot red/orange at low RSI, amber in the middle,
  // neon green/cyan toward high RSI. This avoids copying any third-party palette.
  const hue = 6 + normalized * 178;
  const saturation = 92;
  const lightness = 58 + Math.sin(normalized * Math.PI) * 7;

  return `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness.toFixed(0)}%)`;
}

function pathFrom(values: ChartPoint[]): string {
  return values.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function candleClass(color?: string) {
  if (color === "RED") return "candle red";
  if (color === "YELLOW") return "candle yellow";
  if (color === "BLUE") return "candle blue";
  return "candle green";
}

function isOscillatorIndicator(indicatorKey?: string) {
  return indicatorKey === "RSI_14" || indicatorKey === "ADAPTIVE_RSI_TRIGGER";
}

function getOscillatorValue(point: IndicatorResult["series"][number], indicatorKey?: string): number | null {
  if (indicatorKey === "ADAPTIVE_RSI_TRIGGER") return toFiniteNumber(point.values.AdaptiveRSI);
  if (indicatorKey === "RSI_14") return toFiniteNumber(point.values.RSI);
  return null;
}

export function MiniChart({ result }: MiniChartProps) {
  const series = result?.series?.slice(-80) ?? [];
  const width = 720;
  const height = 260;
  const padding = 24;
  const indicatorKey = result?.indicatorKey;
  const isOscillator = isOscillatorIndicator(indicatorKey);
  const isAdaptiveRsi = indicatorKey === "ADAPTIVE_RSI_TRIGGER";

  if (!series.length) {
    return <div className="chart-empty">ยังไม่มีข้อมูลกราฟ</div>;
  }

  const oscillatorValues = series.map((point) => getOscillatorValue(point, indicatorKey));
  const triggerValues = series.map((point) => toFiniteNumber(point.values.Trigger));
  const overbought = toFiniteNumber(result?.latest?.values.Overbought) ?? (isAdaptiveRsi ? 80 : 70);
  const oversold = toFiniteNumber(result?.latest?.values.Oversold) ?? (isAdaptiveRsi ? 20 : 30);

  const chartValues = isOscillator
    ? [0, 100, overbought, oversold, ...oscillatorValues.filter((value): value is number => value !== null), ...triggerValues.filter((value): value is number => value !== null)]
    : series.flatMap((point) =>
        [point.price, point.values.Fast, point.values.Slow, point.values.HalfTrend, point.values.ATRHigh, point.values.ATRLow]
          .map(toFiniteNumber)
          .filter((value): value is number => value !== null)
      );

  if (!chartValues.length) {
    return <div className="chart-empty">ข้อมูลกราฟไม่ถูกต้อง</div>;
  }

  const rawMin = Math.min(...chartValues);
  const rawMax = Math.max(...chartValues);
  const rawRange = rawMax - rawMin;
  const fallbackRange = Math.max(Math.abs(rawMax), Math.abs(rawMin), 1) * 0.002;
  const domainRange = rawRange > 0 ? rawRange : fallbackRange;
  const domainPadding = isOscillator ? 0 : domainRange * 0.12;
  const min = rawMin - domainPadding;
  const max = rawMax + domainPadding;
  const range = max - min;

  const xFor = (index: number) => padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
  const yFor = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);

  const fastPoints = series.flatMap((point, index) => {
    const value = toFiniteNumber(point.values.Fast);
    return value === null ? [] : [{ x: xFor(index), y: yFor(value), value }];
  });

  const slowPoints = series.flatMap((point, index) => {
    const value = toFiniteNumber(point.values.Slow);
    return value === null ? [] : [{ x: xFor(index), y: yFor(value), value }];
  });

  const halfTrendPoints = series.flatMap((point, index) => {
    const value = toFiniteNumber(point.values.HalfTrend);
    return value === null ? [] : [{ x: xFor(index), y: yFor(value), value }];
  });

  const oscillatorPoints = series.flatMap((point, index) => {
    const value = getOscillatorValue(point, indicatorKey);
    return value === null ? [] : [{ x: xFor(index), y: yFor(value), value }];
  });

  const triggerPoints = series.flatMap((point, index) => {
    const value = toFiniteNumber(point.values.Trigger);
    return value === null ? [] : [{ x: xFor(index), y: yFor(value), value }];
  });

  const markerYFor = (point: (typeof series)[number]) => {
    if (isOscillator) {
      const oscillator = getOscillatorValue(point, indicatorKey);
      return oscillator === null ? null : yFor(oscillator);
    }

    const price = toFiniteNumber(point.price);
    return price === null ? null : yFor(price);
  };

  const renderAdaptiveRsiRainbowLine = () => {
    if (oscillatorPoints.length < 2) return null;

    return oscillatorPoints.slice(1).map((point, index) => {
      const previous = oscillatorPoints[index];
      const color = adaptiveRsiRainbowColor(((previous.value ?? 0) + (point.value ?? 0)) / 2);

      return (
        <line
          key={`rainbow-${index}`}
          x1={previous.x}
          y1={previous.y}
          x2={point.x}
          y2={point.y}
          className="line-rainbow-segment"
          stroke={color}
        />
      );
    });
  };

  return (
    <div className="chart-card-inner">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${result?.indicatorKey ?? "Indicator"} chart`}>
        <defs>
          <linearGradient id="chartGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(46,229,157,.35)" />
            <stop offset="100%" stopColor="rgba(108,168,255,.2)" />
          </linearGradient>
          <linearGradient id="adaptiveRsiLegend" x1="0" x2="1">
            <stop offset="0%" stopColor={adaptiveRsiRainbowColor(0)} />
            <stop offset="50%" stopColor={adaptiveRsiRainbowColor(50)} />
            <stop offset="100%" stopColor={adaptiveRsiRainbowColor(100)} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((row) => (
          <line key={row} x1="0" x2={width} y1={padding + row * 48} y2={padding + row * 48} className="grid-line" />
        ))}

        {isOscillator ? (
          <>
            <line x1={padding} x2={width - padding} y1={yFor(overbought)} y2={yFor(overbought)} className="threshold-line overbought" />
            <line x1={padding} x2={width - padding} y1={yFor(oversold)} y2={yFor(oversold)} className="threshold-line oversold" />
            <text x={padding + 4} y={yFor(overbought) - 7} className="threshold-label">OB {overbought}</text>
            <text x={padding + 4} y={yFor(oversold) + 15} className="threshold-label">OS {oversold}</text>
            {isAdaptiveRsi && oscillatorPoints.length ? <path d={pathFrom(oscillatorPoints)} className="line-rainbow-glow" /> : null}
            {isAdaptiveRsi ? renderAdaptiveRsiRainbowLine() : oscillatorPoints.length ? <path d={pathFrom(oscillatorPoints)} className="line-rsi" /> : null}
            {triggerPoints.length ? <path d={pathFrom(triggerPoints)} className="line-trigger" /> : null}
            {isAdaptiveRsi ? (
              <g className="rainbow-legend" transform={`translate(${width - padding - 152}, ${padding + 2})`}>
                <rect x="0" y="0" width="152" height="28" rx="10" />
                <rect x="9" y="9" width="58" height="6" rx="3" className="rainbow-legend-bar" />
                <text x="75" y="15">Rainbow RSI</text>
              </g>
            ) : null}
          </>
        ) : (
          <>
            {series.map((point, index) => {
              const price = toFiniteNumber(point.price);
              if (price === null) return null;

              const x = xFor(index);
              const y = yFor(price);
              return <rect key={`${point.time}-${index}`} className={candleClass(point.color)} x={x - 2.5} y={y - 14} width="5" height="28" rx="3" />;
            })}
            {fastPoints.length ? <path d={pathFrom(fastPoints)} className="line-fast" /> : null}
            {slowPoints.length ? <path d={pathFrom(slowPoints)} className="line-slow" /> : null}
            {halfTrendPoints.length ? <path d={pathFrom(halfTrendPoints)} className="line-half-trend" /> : null}
          </>
        )}

        {series.map((point, index) => {
          const y = markerYFor(point);
          if (y === null || (point.signal !== "BUY" && point.signal !== "SELL")) return null;

          const x = xFor(index);
          const oscillator = getOscillatorValue(point, indicatorKey);
          const markerFill = isAdaptiveRsi && oscillator !== null ? adaptiveRsiRainbowColor(oscillator) : undefined;

          if (point.signal === "BUY") {
            return (
              <polygon
                key={`marker-${point.time}-${index}`}
                className="signal-marker buy"
                style={markerFill ? { fill: markerFill } : undefined}
                points={`${x.toFixed(2)},${(y - 30).toFixed(2)} ${(x - 7).toFixed(2)},${(y - 17).toFixed(2)} ${(x + 7).toFixed(2)},${(y - 17).toFixed(2)}`}
              />
            );
          }

          return (
            <polygon
              key={`marker-${point.time}-${index}`}
              className="signal-marker sell"
              style={markerFill ? { fill: markerFill } : undefined}
              points={`${x.toFixed(2)},${(y + 30).toFixed(2)} ${(x - 7).toFixed(2)},${(y + 17).toFixed(2)} ${(x + 7).toFixed(2)},${(y + 17).toFixed(2)}`}
            />
          );
        })}
      </svg>
    </div>
  );
}
