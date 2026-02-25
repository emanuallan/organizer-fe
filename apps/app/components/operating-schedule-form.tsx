/**
 * Form for editing facility operating schedule: one row per day with start/end time (HH:mm). Empty = closed.
 */

import { LEAGUE_DAY_OPTIONS } from "@/lib/league-schedule";
import { Label } from "@repo/ui";
import type { FacilityDayKey, FacilityOperatingSchedule } from "@repo/db/schema/facility";

export type OperatingScheduleFormState = Record<
  FacilityDayKey,
  { startTime: string; endTime: string }
>;

const DAY_KEYS = LEAGUE_DAY_OPTIONS.map((o) => o.value) as FacilityDayKey[];

export function formStateFromSchedule(
  schedule: FacilityOperatingSchedule | null | undefined,
): OperatingScheduleFormState {
  const state = {} as OperatingScheduleFormState;
  for (const day of DAY_KEYS) {
    const hours = schedule?.[day];
    state[day] =
      hours && typeof hours === "object" && hours.startTime != null && hours.endTime != null
        ? { startTime: hours.startTime, endTime: hours.endTime }
        : { startTime: "", endTime: "" };
  }
  return state;
}

export function scheduleFromFormState(
  state: OperatingScheduleFormState,
): FacilityOperatingSchedule {
  const schedule: FacilityOperatingSchedule = {};
  for (const day of DAY_KEYS) {
    const { startTime, endTime } = state[day];
    schedule[day] =
      startTime?.trim() && endTime?.trim()
        ? { startTime: startTime.trim(), endTime: endTime.trim() }
        : null;
  }
  return schedule;
}

const initialFormState: OperatingScheduleFormState = Object.fromEntries(
  DAY_KEYS.map((d) => [d, { startTime: "", endTime: "" }]),
) as OperatingScheduleFormState;

export function getInitialOperatingScheduleFormState(
  schedule: FacilityOperatingSchedule | null | undefined,
): OperatingScheduleFormState {
  if (!schedule || typeof schedule !== "object") return { ...initialFormState };
  return formStateFromSchedule(schedule);
}

interface OperatingScheduleFormProps {
  value: OperatingScheduleFormState;
  onChange: (value: OperatingScheduleFormState) => void;
  disabled?: boolean;
}

export function OperatingScheduleForm({
  value,
  onChange,
  disabled = false,
}: OperatingScheduleFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(4rem,auto)_1fr_1fr] gap-2 items-center text-sm">
        <span className="text-muted-foreground font-medium">Day</span>
        <Label className="text-muted-foreground font-medium">Start</Label>
        <Label className="text-muted-foreground font-medium">End</Label>
        {LEAGUE_DAY_OPTIONS.map(({ value: day, label }) => (
          <div key={day} className="contents">
            <span
              className="inline-flex w-fit px-2 py-0.5 text-xs font-medium rounded-full bg-secondary"
            >
              {label}
            </span>
            <input
              type="time"
              aria-label={`${label} start`}
              value={value[day as FacilityDayKey]?.startTime ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [day]: {
                    ...value[day as FacilityDayKey],
                    startTime: e.target.value,
                  },
                })
              }
              disabled={disabled}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <input
              type="time"
              aria-label={`${label} end`}
              value={value[day as FacilityDayKey]?.endTime ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [day]: {
                    ...value[day as FacilityDayKey],
                    endTime: e.target.value,
                  },
                })
              }
              disabled={disabled}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Leave start and end empty for closed days. Times in 24-hour format.
      </p>
    </div>
  );
}
