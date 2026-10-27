const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const pad = (n: number) => String(n).padStart(2, "0");

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function dayLabel(d: Date, now: Date): string {
  if (sameDay(d, now)) return "今天";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, tomorrow)) return "明天";
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

/** 例：「今天 10:30 – 12:00」「明天 09:00 – 後天 12:00」 */
export function formatTripTime(
  trip: { startAt: Date; endAt: Date },
  now: Date,
): string {
  const start = `${dayLabel(trip.startAt, now)} ${clock(trip.startAt)}`;
  if (sameDay(trip.startAt, trip.endAt)) {
    return `${start} – ${clock(trip.endAt)}`;
  }
  return `${start} – ${dayLabel(trip.endAt, now)} ${clock(trip.endAt)}`;
}
