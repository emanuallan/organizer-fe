/**
 * Leagues belong to organizations. Teams participate via league_team.
 */

import { relations, sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organization } from "./organization";

export const league = pgTable(
  "league",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text().notNull(),
    image: text(),
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
