/**
 * Age group enum for leagues (Toddlers, U6–U18, Adult, O30, O50, O60).
 */
import { pgEnum } from "drizzle-orm/pg-core";

export const leagueAgeGroupEnum = pgEnum("league_age_group", [
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
]);

export type LeagueAgeGroup = (typeof leagueAgeGroupEnum.enumValues)[number];
