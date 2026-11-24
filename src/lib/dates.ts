/**
 * Day labels for API series.
 *
 * The backend serialises `date` columns as RFC 3339 timestamps (for example
 * `2026-11-23T00:00:00Z`), while older payloads and fixtures use plain
 * `YYYY-MM-DD`. Both must produce a readable label; interpolating the raw value
 * into another date string produced `Invalid Date`.
 */
export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  // Local noon keeps the calendar day stable across time zones and DST changes.
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayLabel(value: string): string {
  const date = parseDay(value);
  return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : value;
}
