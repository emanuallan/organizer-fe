/**
 * Team member role: one admin per team, rest are members.
 */
import { pgEnum } from "drizzle-orm/pg-core";

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "admin",
  "member",
]);

export type TeamMemberRole = (typeof teamMemberRoleEnum.enumValues)[number];
