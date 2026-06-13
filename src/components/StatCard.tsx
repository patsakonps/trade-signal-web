type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "warning" | "blue";
};

export function StatCard({ label, value, sub, tone }: StatCardProps) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className={tone ? `stat-value ${tone}` : "stat-value"}>{value}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}
