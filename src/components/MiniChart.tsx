import type { IndicatorResult } from "../lib/types";

type MiniChartProps = {
  result?: IndicatorResult | null;
};

function pathFrom(values: Array<{ x: number; y: number }>): string {
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

  const prices = series.flatMap((point) => [point.price, Number(point.values.Fast), Number(point.values.Slow)].filter(Number.isFinite));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);

  const xFor = (index: number) => padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
  const yFor = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);

  const fastPoints = series.map((point, index) => ({ x: xFor(index), y: yFor(Number(point.values.Fast)) }));
  const slowPoints = series.map((point, index) => ({ x: xFor(index), y: yFor(Number(point.values.Slow)) }));

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
          const x = xFor(index);
          const y = yFor(point.price);
          const tone = point.color === "RED" ? "candle red" : point.color === "YELLOW" ? "candle yellow" : point.color === "BLUE" ? "candle blue" : "candle green";
          return <rect key={`${point.time}-${index}`} className={tone} x={x - 2.5} y={y - 14} width="5" height="28" rx="3" />;
        })}
        <path d={pathFrom(fastPoints)} className="line-fast" />
        <path d={pathFrom(slowPoints)} className="line-slow" />
      </svg>
    </div>
  );
}
