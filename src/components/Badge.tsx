type BadgeProps = {
  children: React.ReactNode;
  tone?: "green" | "red" | "yellow" | "blue" | "neutral";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function toneFromZone(zone?: string): "green" | "red" | "yellow" | "blue" | "neutral" {
  if (zone === "GREEN" || zone === "BUY") return "green";
  if (zone === "RED" || zone === "SELL") return "red";
  if (zone === "YELLOW") return "yellow";
  if (zone === "BLUE") return "blue";
  return "neutral";
}
