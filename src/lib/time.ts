const THAI_TIME_ZONE = "Asia/Bangkok";

type TimeInput = string | number | Date | undefined | null;

function toDate(value: TimeInput): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatThaiDateTime(value: TimeInput): string {
  const date = toDate(value);
  if (!date) return "-";
  return `${new Intl.DateTimeFormat("th-TH", {
    timeZone: THAI_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date).replace(",", "")} น.`;
}

export function formatThaiTime(value: TimeInput): string {
  const date = toDate(value);
  if (!date) return "-";
  return `${new Intl.DateTimeFormat("th-TH", {
    timeZone: THAI_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date)} น.`;
}

export function formatTimeAgoThai(value: TimeInput): string {
  const date = toDate(value);
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "เมื่อสักครู่";

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} วันที่แล้ว`;
}

export function timeframeToMs(timeframe: string): number | null {
  const match = timeframe.match(/^(\d+)(m|h|d|w|M)$/);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) return null;

  if (unit === "m") return value * 60_000;
  if (unit === "h") return value * 60 * 60_000;
  if (unit === "d") return value * 24 * 60 * 60_000;
  if (unit === "w") return value * 7 * 24 * 60 * 60_000;
  if (unit === "M") return value * 30 * 24 * 60 * 60_000;
  return null;
}

export function isDataStale(closeTime: TimeInput, timeframe: string): boolean {
  const date = toDate(closeTime);
  const timeframeMs = timeframeToMs(timeframe);
  if (!date || !timeframeMs) return false;
  return Date.now() - date.getTime() > timeframeMs * 2.2;
}
