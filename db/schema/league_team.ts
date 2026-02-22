/**
 * Junction table linking leagues to teams. Each league can have one team; each team can be in one league (per schema UNIQUEs).
 */

import { relations, sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { league } from "./league";
import { team } from "./team";

export const leagueTeam = pgTable(
  "league_team",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    leagueId: text()
      .notNull()
      .unique()
      .references(() => league.id, { onDelete: "cascade" }),
    teamId: text()
      .notNull()
      .unique()
      .references(() => team.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("league_team_league_team_unique").on(table.leagueId, table.teamId),
    index("league_team_league_id_idx").on(table.leagueId),
    index("league_team_team_id_idx").on(table.teamId),
  ],
);

export type LeagueTeam = typeof leagueTeam.$inferSelect;
export type NewLeagueTeam = typeof leagueTeam.$inferInsert;

export const leagueTeamRelations = relations(leagueTeam, ({ one }) => ({
  league: one(league, {
    fields: [leagueTeam.leagueId],
    references: [league.id],
  }),
  team: one(team, {
    fields: [leagueTeam.teamId],
    references: [team.id],
  }),
}));
