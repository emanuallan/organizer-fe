// Teams belong to organizations; linked to leagues via league_team

import { relations, sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { user } from "./user";
import { playerStatusEnum } from "./player_status";

export const teamStatusEnum = pgEnum("team_status", [
  "active",
  "inactive",
  "banned",
  "suspended",
]);

/**
 * Teams table. Teams belong to an organization; link to leagues via league_team.
 */
export const team = pgTable(
  "team",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text().notNull(),
    slug: text()
      .notNull()
      .unique()
      .default(
        sql`upper(substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 7))`,
      ),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: teamStatusEnum().default("inactive"),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("team_organization_id_idx").on(table.organizationId),
  ],
);

export type Team = typeof team.$inferSelect;
export type NewTeam = typeof team.$inferInsert;

/**
 * Team membership table. Links users to teams.
 * Player status lives on organization_player (org-level).
 */
export const teamMember = pgTable(
  "team_member",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    teamId: text()
      .notNull()
      .unique()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("team_member_team_user_unique").on(table.teamId, table.userId),
    index("team_member_team_id_idx").on(table.teamId),
    index("team_member_user_id_idx").on(table.userId),
  ],
);

export type TeamMember = typeof teamMember.$inferSelect;
export type NewTeamMember = typeof teamMember.$inferInsert;

// —————————————————————————————————————————————————————————————————————————————
// Relations
// —————————————————————————————————————————————————————————————————————————————

export const teamRelations = relations(team, ({ one, many }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  members: many(teamMember),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
}));
