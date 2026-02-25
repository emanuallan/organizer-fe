/**
 * League schedule: same format as facility operating schedule.
 * Per-day hours (monday–sunday): { startTime, endTime } in HH:mm or null.
 * Display uses getFacilityScheduleGroups from @/lib/facility-schedule.
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
