import {
  boolean,
  date,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { availabilityExceptionTypeEnum } from "./enums";
import { doctors } from "./doctors";
import { practices } from "./practices";

// Weekly recurring availability rules.
// practice_id is denormalized for RLS policy performance (avoids a join per row).
export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Denormalized from doctors.practice_id for efficient RLS evaluation
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayOfWeek: smallint("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  // null = open-ended (rule applies indefinitely from effectiveFrom)
  effectiveTo: date("effective_to"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One-off date overrides: block a day, add an extra session, etc.
// practice_id is denormalized for RLS (same reason as availabilityRules).
export const availabilityExceptions = pgTable("availability_exceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  // null when full_day = true
  startTime: time("start_time"),
  endTime: time("end_time"),
  type: availabilityExceptionTypeEnum("type").notNull(),
  reason: text("reason"),
  fullDay: boolean("full_day").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type NewAvailabilityRule = typeof availabilityRules.$inferInsert;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;
export type NewAvailabilityException =
  typeof availabilityExceptions.$inferInsert;
