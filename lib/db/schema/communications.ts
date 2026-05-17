import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  communicationChannelEnum,
  communicationDirectionEnum,
  communicationProviderEnum,
  communicationStatusEnum,
} from "./enums";
import { appointments } from "./appointments";
import { patients } from "./patients";
import { practices } from "./practices";

export const communicationsLog = pgTable(
  "communications_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    channel: communicationChannelEnum("channel").notNull(),
    direction: communicationDirectionEnum("direction")
      .notNull()
      .default("outbound"),
    templateName: text("template_name").notNull(),
    status: communicationStatusEnum("status").notNull().default("queued"),
    provider: communicationProviderEnum("provider").notNull(),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    payload: jsonb("payload"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Idempotency: prevent duplicate sends per appointment + template + channel.
  // Partial (WHERE appointment_id IS NOT NULL) because Postgres NULLs are not
  // equal in UNIQUE constraints — non-appointment comms deduplicated at app layer.
  // NOTE: The partial unique index is added in 0001_schema.sql; Drizzle's
  // uniqueIndex doesn't support WHERE clauses yet, so we use a raw SQL index.
);

export const reminderSchedules = pgTable("reminder_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id, { onDelete: "cascade" }),
  channel: communicationChannelEnum("channel").notNull(),
  hoursBefore: integer("hours_before").notNull(),
  templateName: text("template_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  // e.g. ['confirmed'] — appointment must be in this status to receive reminder
  appliesToStatus: text("applies_to_status").array().notNull().default(["confirmed"]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CommunicationsLog = typeof communicationsLog.$inferSelect;
export type NewCommunicationsLog = typeof communicationsLog.$inferInsert;
export type ReminderSchedule = typeof reminderSchedules.$inferSelect;
export type NewReminderSchedule = typeof reminderSchedules.$inferInsert;
