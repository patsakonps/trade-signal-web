import type { IndicatorResult } from "../lib/types";

type MiniChartProps = {
  result?: IndicatorResult | null;
};

type ChartPoint = { x: number; y: number };

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pathFrom(values: ChartPoint[]): string {
  return values.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

export function MiniChart({ result }: MiniChartProps) {
  const series = result?.series?.slice(-80) ?? [];
  const width = 720;
  const height = 260;
  const padding = 24;

  if (!series.length) {
    return <div className="chart-empty">ยังไม่มีข้อมูลกราฟ</div>;
  }

  const chartValues = series.flatMap((point) =>
    [point.price, point.values.Fast, point.values.Slow]
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
  const domainPadding = domainRange * 0.12;
  const min = rawMin - domainPadding;
  const max = rawMax + domainPadding;
  const range = max - min;

  const xFor = (index: number) => padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
  const yFor = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);

  const fastPoints = series.flatMap((point, index) => {
    const value = toFiniteNumber(point.values.Fast);
    return value === null ? [] : [{ x: xFor(index), y: yFor(value) }];
  });

  const slowPoints = series.flatMap((point, index) => {
    const value = toFiniteNumber(point.values.Slow);
    return value === null ? [] : [{ x: xFor(index), y: yFor(value) }];
  });

  return (
    <div className="chart-card-inner">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="CDC Action Zone chart">
        <defs>
          <linearGradient id="chartGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(46,229,157,.35)" />
            <stop offset="100%" stopColor="rgba(108,168,255,.2)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((row) => (
          <line key={row} x1="0" x2={width} y1={padding + row * 48} y2={padding + row * 48} className="grid-line" />
        ))}
        {series.map((point, index) => {
          const price = toFiniteNumber(point.price);
          if (price === null) return null;

          const x = xFor(index);
          const y = yFor(price);
          const tone = point.color === "RED" ? "candle red" : point.color === "YELLOW" ? "candle yellow" : point.color === "BLUE" ? "candle blue" : "candle green";
          return <rect key={`${point.time}-${index}`} className={tone} x={x - 2.5} y={y - 14} width="5" height="28" rx="3" />;
        })}
        {fastPoints.length ? <path d={pathFrom(fastPoints)} className="line-fast" /> : null}
        {slowPoints.length ? <path d={pathFrom(slowPoints)} className="line-slow" /> : null}
        {series.map((point, index) => {
          const price = toFiniteNumber(point.price);
          if (price === null || (point.signal !== "BUY" && point.signal !== "SELL")) return null;

          const x = xFor(index);
          const y = yFor(price);
          if (point.signal === "BUY") {
            return (
              <polygon
                key={`marker-${point.time}-${index}`}
                className="signal-marker buy"
                points={`${x.toFixed(2)},${(y - 30).toFixed(2)} ${(x - 7).toFixed(2)},${(y - 17).toFixed(2)} ${(x + 7).toFixed(2)},${(y - 17).toFixed(2)}`}
              />
            );
          }

          return (
            <polygon
              key={`marker-${point.time}-${index}`}
              className="signal-marker sell"
              points={`${x.toFixed(2)},${(y + 30).toFixed(2)} ${(x - 7).toFixed(2)},${(y + 17).toFixed(2)} ${(x + 7).toFixed(2)},${(y + 17).toFixed(2)}`}
            />
          );
        })}
      </svg>
    </div>
  );
}
