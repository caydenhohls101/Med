import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { practices } from "./practices";

export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id, { onDelete: "cascade" }),
  // nullable: links to auth.users if the doctor logs in directly
  userId: uuid("user_id"),
  fullName: text("full_name").notNull(),
  // CHECK constraint applied in SQL migration: ('Dr','Prof','Mr','Mrs','Ms','Sister','Adv')
  title: text("title").notNull().default("Dr"),
  hpcsaNumber: text("hpcsa_number"),
  specialty: text("specialty"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  defaultAppointmentDurationMinutes: integer(
    "default_appointment_duration_minutes",
  )
    .notNull()
    .default(15),
  // Gap between appointments (soft — enforced by availability engine, not DB constraint)
  bufferMinutes: integer("buffer_minutes").notNull().default(0),
  color: text("color").notNull().default("#2563EB"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
