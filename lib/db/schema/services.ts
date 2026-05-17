import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { doctors } from "./doctors";
import { practices } from "./practices";

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id, { onDelete: "cascade" }),
  // null = offered by any active doctor in this practice
  doctorId: uuid("doctor_id").references(() => doctors.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  // All money in integer cents — never floats
  priceCents: integer("price_cents").notNull().default(0),
  requiresReferral: boolean("requires_referral").notNull().default(false),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
