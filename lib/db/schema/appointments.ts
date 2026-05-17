import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  appointmentSourceEnum,
  appointmentStatusEnum,
} from "./enums";
import { doctors } from "./doctors";
import { patients } from "./patients";
import { practices } from "./practices";
import { services } from "./services";

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id, { onDelete: "restrict" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "restrict" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "restrict" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  // All stored as UTC timestamptz; display in Africa/Johannesburg
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  source: appointmentSourceEnum("source").notNull().default("online"),
  // Human-readable reference: MB-YYMMDD-XXXX (generated in application before insert)
  referenceNumber: text("reference_number").notNull().unique(),
  notes: text("notes"),           // patient-supplied; shown to patient
  internalNotes: text("internal_notes"), // staff-only
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledByUserId: uuid("cancelled_by_user_id"), // FK to auth.users
  cancelReason: text("cancel_reason"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // NOTE: The GIST exclusion constraint preventing doctor double-booking
  // is defined in the SQL migration (0001_schema.sql) because Drizzle does
  // not support EXCLUDE USING GIST natively.
  // Constraint: EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  //             WHERE (status IN ('pending', 'confirmed'))
});

// practice_id is denormalized here for RLS performance
export const appointmentStatusHistory = pgTable(
  "appointment_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Denormalized from appointments.practice_id for efficient RLS
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    fromStatus: appointmentStatusEnum("from_status"),
    toStatus: appointmentStatusEnum("to_status").notNull(),
    changedByUserId: uuid("changed_by_user_id"), // FK to auth.users
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reason: text("reason"),
  },
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type AppointmentStatusHistory =
  typeof appointmentStatusHistory.$inferSelect;
