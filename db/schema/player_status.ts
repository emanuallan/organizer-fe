/**
 * Shared player status enum (used by organization_player; kept for team_member legacy/compat).
 */
import { pgEnum } from "drizzle-orm/pg-core";

export const playerStatusEnum = pgEnum("player_status", [
  "active",
  "inactive",
  "banned",
  "suspended",
  "injured",
]);
