import { config } from "./config";

function tzOffsetMs(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(at));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** UTC instant for 00:00 of the given calendar day (yyyy-mm-dd) in the shop timezone. */
export function startOfDay(dateStr: string, tz = config.timezone): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - tzOffsetMs(guess, tz));
}

export function todayString(tz = config.timezone): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function startOfToday(tz = config.timezone): Date {
  return startOfDay(todayString(tz), tz);
}

/** Inclusive from/to (yyyy-mm-dd, shop tz) -> [gte, lt) Date range. */
export function dateRange(from?: string, to?: string): { gte?: Date; lt?: Date } {
  const range: { gte?: Date; lt?: Date } = {};
  if (from) range.gte = startOfDay(from);
  if (to) range.lt = new Date(startOfDay(to).getTime() + 24 * 3600 * 1000);
  return range;
}
