import { Badge, toneFromZone } from "./Badge";

type SignalCardProps = {
  title: string;
  description: string;
  zone?: string;
};

export function SignalCard({ title, description, zone }: SignalCardProps) {
  return (
    <div className="signal-card">
      <div className={`signal-dot ${toneFromZone(zone)}`} />
      <div className="signal-content">
        <div className="signal-title-row">
          <b>{title}</b>
          {zone ? <Badge tone={toneFromZone(zone)}>{zone}</Badge> : null}
        </div>
        <span>{description}</span>
      </div>
    </div>
  );
}
