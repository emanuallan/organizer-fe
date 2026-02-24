/**
 * League age group options and display labels.
 * Values match db/schema/league_age_group.ts enum.
 */

export const LEAGUE_AGE_GROUP_VALUES = [
  "toddlers",
  "u6",
  "u7",
  "u8",
  "u9",
  "u10",
  "u11",
  "u12",
  "u13",
  "u14",
  "u15",
  "u16",
  "u17",
  "u18",
  "adult",
  "o30",
  "o50",
  "o60",
] as const;

export type LeagueAgeGroupValue = (typeof LEAGUE_AGE_GROUP_VALUES)[number];

const LABELS: Record<LeagueAgeGroupValue, string> = {
  toddlers: "Toddlers",
  u6: "U6",
  u7: "U7",
  u8: "U8",
  u9: "U9",
  u10: "U10",
  u11: "U11",
  u12: "U12",
  u13: "U13",
  u14: "U14",
  u15: "U15",
  u16: "U16",
  u17: "U17",
  u18: "U18",
  adult: "Adult",
  o30: "Over 30",
  o50: "Over 50",
  o60: "Over 60",
};

export function getLeagueAgeGroupLabel(value: string | null | undefined): string {
  if (value == null) return "—";
  return LABELS[value as LeagueAgeGroupValue] ?? value;
}

export const LEAGUE_AGE_GROUP_OPTIONS: { value: LeagueAgeGroupValue; label: string }[] =
  LEAGUE_AGE_GROUP_VALUES.map((value) => ({
    value,
    label: LABELS[value],
  }));
