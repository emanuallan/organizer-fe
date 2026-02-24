/**
 * League schedule: days of week and time range.
 * Stored in DB as days[] ('monday', ...) and startTime/endTime ('HH:mm').
 */

export const LEAGUE_DAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type LeagueDayValue = (typeof LEAGUE_DAY_VALUES)[number];

const DAY_LABELS: Record<LeagueDayValue, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export function getLeagueDayLabel(day: string): string {
  return DAY_LABELS[day as LeagueDayValue] ?? day;
}

export const LEAGUE_DAY_OPTIONS: { value: LeagueDayValue; label: string }[] =
  LEAGUE_DAY_VALUES.map((value) => ({
    value,
    label: DAY_LABELS[value],
  }));

export interface LeagueScheduleDisplay {
  days: string[] | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
}

/** Parse "HH:mm" and return 12-hour string, e.g. "9:00 AM", "5:30 PM". */
export function formatTimeTo12h(time: string): string {
  if (!time?.trim()) return "";
  const [h, m] = time.trim().split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const hour = h % 12 || 12;
  const minute = Number.isNaN(m) ? 0 : m;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

/** Format time range for display in 12-hour format, e.g. "9:00 AM – 5:00 PM". */
export function formatLeagueTimeRange12h(league: LeagueScheduleDisplay): string {
  const start = league.startTime ?? "";
  const end = league.endTime ?? "";
  const s12 = formatTimeTo12h(start);
  const e12 = formatTimeTo12h(end);
  if (s12 && e12) return `${s12} – ${e12}`;
  return s12 || e12 || "";
}

/** Sorted day labels for a league (for rendering chips). */
export function getLeagueScheduleDayLabels(
  league: LeagueScheduleDisplay,
): string[] {
  if (!league.days?.length) return [];
  return league.days
    .slice()
    .sort(
      (a, b) =>
        LEAGUE_DAY_VALUES.indexOf(a as LeagueDayValue) -
        LEAGUE_DAY_VALUES.indexOf(b as LeagueDayValue),
    )
    .map(getLeagueDayLabel);
}

/** Format schedule for display, e.g. "Mon, Wed, Fri · 9:00 AM – 5:00 PM". */
export function formatLeagueSchedule(league: LeagueScheduleDisplay): string {
  const dayLabels = getLeagueScheduleDayLabels(league);
  const days = dayLabels.length ? dayLabels.join(", ") : "";
  const timeRange = formatLeagueTimeRange12h(league);
  if (days && timeRange) return `${days} · ${timeRange}`;
  if (days) return days;
  if (timeRange) return timeRange;
  return "—";
}
