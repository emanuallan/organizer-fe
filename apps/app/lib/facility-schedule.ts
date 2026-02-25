/**
 * Facility operating schedule: per-day hours, displayed with same chip + 12h format as league schedule.
 */

import { formatTimeTo12h } from "@/lib/league-schedule";
import { getLeagueDayLabel } from "@/lib/league-schedule";
import type { FacilityOperatingSchedule } from "@repo/db/schema/facility";

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type FacilityScheduleGroup = {
  dayLabels: string[];
  timeRange: string;
};

/** Group days that share the same hours; return groups with day chips labels and 12h time range (or "Closed"). */
export function getFacilityScheduleGroups(
  schedule: FacilityOperatingSchedule | null | undefined,
): FacilityScheduleGroup[] {
  if (!schedule || typeof schedule !== "object") return [];

  type Key = string;
  const byKey = new Map<
    Key,
    {
      days: (typeof DAY_KEYS)[number][];
      startTime?: string;
      endTime?: string;
    }
  >();

  for (const day of DAY_KEYS) {
    const hours = schedule[day];
    const key =
      hours &&
      typeof hours === "object" &&
      hours.startTime != null &&
      hours.endTime != null
        ? `${hours.startTime}|${hours.endTime}`
        : "closed";
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        days: [day],
        ...(key === "closed"
          ? {}
          : {
              startTime: (hours as { startTime: string; endTime: string })
                .startTime,
              endTime: (hours as { startTime: string; endTime: string }).endTime,
            }),
      });
    } else {
      existing.days.push(day);
    }
  }

  return Array.from(byKey.entries())
    .map(([key, { days, startTime, endTime }]) => ({
      firstDayIndex: DAY_KEYS.indexOf(days[0]),
      dayLabels: days.map((d) => getLeagueDayLabel(d)),
      timeRange:
        key === "closed"
          ? "Closed"
          : `${formatTimeTo12h(startTime ?? "")} – ${formatTimeTo12h(endTime ?? "")}`,
    }))
    .sort((a, b) => a.firstDayIndex - b.firstDayIndex)
    .map(({ dayLabels, timeRange }) => ({ dayLabels, timeRange }));
}
