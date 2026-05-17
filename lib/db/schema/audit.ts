import {
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { practices } from "./practices";

// Append-only audit trail. Never updated, never deleted by application code.
// Writes go through lib/audit/index.ts using the service-role client only.
// Authenticated users cannot INSERT via RLS (policy enforces WITH CHECK (false)).
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id, {
    onDelete: "set null",
  }),
  // FK to auth.users — nullable for system actions (e.g. Edge Function reminders)
  userId: uuid("user_id"),
  // e.g. 'patient.view', 'appointment.cancel', 'patient.delete'
  action: text("action").notNull(),
  // e.g. 'patient', 'appointment', 'practice'
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  // No updatedAt — append-only
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
