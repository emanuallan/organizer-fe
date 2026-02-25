/**
 * Leagues belong to organizations. Teams participate via league_team.
 */

import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { FacilityOperatingSchedule } from "./facility";
import { leagueAgeGroupEnum } from "./league_age_group";
import { organization } from "./organization";

export const league = pgTable(
  "league",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text().notNull(),
    /** League code (slug), unique per organization. */
    slug: text()
      .notNull()
      .default(
        sql`upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 7))`,
      ),
    image: text(),
    ageGroup: leagueAgeGroupEnum(),
    /** Operating schedule by day (same format as facility): per-day start/end in HH:mm, null = not scheduled. */
    operatingSchedule: jsonb("operating_schedule")
      .$type<FacilityOperatingSchedule | null>()
      .default(null),
    /** Optional start date of the league. */
    startDate: date("start_date", { mode: "string" }),
    /** Optional end date of the league. */
    endDate: date("end_date", { mode: "string" }),
    organizationId: text()
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("league_id_org_unique").on(table.id, table.organizationId),
    unique("league_org_name_unique").on(table.organizationId, table.name),
    unique("league_org_slug_unique").on(table.organizationId, table.slug),
    index("league_organization_id_idx").on(table.organizationId),
  ],
);

export type League = typeof league.$inferSelect;
export type NewLeague = typeof league.$inferInsert;

export const leagueRelations = relations(league, ({ one }) => ({
  organization: one(organization, {
    fields: [league.organizationId],
    references: [organization.id],
  }),
}));
