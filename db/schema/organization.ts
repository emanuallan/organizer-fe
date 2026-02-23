// Multi-tenant organizations and memberships with role-based access control

import { relations, sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { playerStatusEnum } from "./player_status";

/**
 * Organizations table for Better Auth organization plugin.
 * Each organization represents a separate tenant with isolated data.
 */
export const organization = pgTable("organization", {
  id: text()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text().notNull(),
  slug: text()
    .notNull()
    .unique()
    .default(sql`gen_random_string(7, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')`),
  logo: text(),
  metadata: text(), // Better Auth expects string (JSON serialized)
  createdAt: timestamp({ withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

/**
 * Organization membership table for Better Auth organization plugin.
 * Links users to organizations with specific roles.
 *
 * Role values (Better Auth defaults):
 * - "owner": Full control, can delete organization
 * - "admin": Can manage members and settings
 * - "member": Standard access
 *
 * @see apps/api/lib/auth.ts creatorRole config
 */
export const member = pgTable(
  "organization_member",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: pgEnum("role", ["admin", "editor", "viewer"])()
      .default("viewer")
      .notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("organization_member_user_org_unique").on(
      table.userId,
      table.organizationId,
    ),
    index("organization_member_user_id_idx").on(table.userId),
    index("organization_member_organization_id_idx").on(table.organizationId),
  ],
);

export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;

/**
 * Organization player roster. Users in this table are "players" recognized by
 * the org. Those not in any team_member (for this org's teams) are free agents.
 * Add here when registering a new player (free agent) or when adding someone
 * to a team (ensure they're on the roster). "All org players" = organization_player;
 * "Free agents" = in organization_player and not in any team_member for org's teams.
 * Status (active, inactive, banned, etc.) is at the org level here.
 */
export const organizationPlayer = pgTable(
  "organization_player",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: playerStatusEnum().default("inactive").notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("organization_player_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    index("organization_player_organization_id_idx").on(table.organizationId),
    index("organization_player_user_id_idx").on(table.userId),
  ],
);

export type OrganizationPlayer = typeof organizationPlayer.$inferSelect;
export type NewOrganizationPlayer = typeof organizationPlayer.$inferInsert;

// —————————————————————————————————————————————————————————————————————————————
// Relations for better query experience
// —————————————————————————————————————————————————————————————————————————————

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  players: many(organizationPlayer),
}));

export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
}));

export const organizationPlayerRelations = relations(
  organizationPlayer,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationPlayer.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [organizationPlayer.userId],
      references: [user.id],
    }),
  }),
);
