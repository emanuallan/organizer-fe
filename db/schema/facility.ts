/**
 * Facilities and their surfaces (fields, courts, etc.) for an organization.
 * Used for scheduling: leagues and teams can be assigned to play at a facility/surface.
 */

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization } from "./organization";

export const facilitySurfaceTypeEnum = pgEnum("facility_surface_type", [
  "field",
  "court",
  "diamond",
  "rink",
  "other",
]);

/** Operating hours for a single day (HH:mm). */
export type FacilityDayHours = {
  startTime: string;
  endTime: string;
};

/** Day keys for operating schedule (monday–sunday). */
export const FACILITY_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type FacilityDayKey = (typeof FACILITY_DAY_KEYS)[number];

/** Operating schedule: per-day hours. Missing or null = closed. */
export type FacilityOperatingSchedule = Partial<
  Record<FacilityDayKey, FacilityDayHours | null>
>;

/**
 * Facility: a venue (e.g. "Riverside Park", "Community Center") owned or used by the org.
 */
export const facility = pgTable(
  "facility",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text().notNull(),
    slug: text().notNull(),
    address: text(),
    /** Operating hours by day (monday–sunday). Each day may have { startTime, endTime } in HH:mm or be null/omitted for closed. */
    operatingSchedule: jsonb("operating_schedule")
      .$type<FacilityOperatingSchedule | null>()
      .default(null),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("facility_org_slug_unique").on(table.organizationId, table.slug),
    index("facility_organization_id_idx").on(table.organizationId),
  ],
);

export type Facility = typeof facility.$inferSelect;
export type NewFacility = typeof facility.$inferInsert;

/**
 * Surface: a bookable unit within a facility (Field 1, Court A, Diamond 2, etc.).
 */
export const facilitySurface = pgTable(
  "facility_surface",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    facilityId: text()
      .notNull()
      .references(() => facility.id, { onDelete: "cascade" }),
    name: text().notNull(),
    type: facilitySurfaceTypeEnum().default("other").notNull(),
    sortOrder: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("facility_surface_facility_name_unique").on(table.facilityId, table.name),
    index("facility_surface_facility_id_idx").on(table.facilityId),
  ],
);

export type FacilitySurface = typeof facilitySurface.$inferSelect;
export type NewFacilitySurface = typeof facilitySurface.$inferInsert;

export const facilityRelations = relations(facility, ({ one, many }) => ({
  organization: one(organization, {
    fields: [facility.organizationId],
    references: [organization.id],
  }),
  surfaces: many(facilitySurface),
}));

export const facilitySurfaceRelations = relations(
  facilitySurface,
  ({ one }) => ({
    facility: one(facility, {
      fields: [facilitySurface.facilityId],
      references: [facility.id],
    }),
  }),
);
