import {
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums";
import { practices } from "./practices";

// Maps auth.users → practices with a role.
// auth.users is managed by Supabase Auth — we reference it by UUID only.
export const practiceUsers = pgTable(
  "practice_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(), // FK to auth.users — managed by Supabase
    role: userRoleEnum("role").notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.practiceId, t.userId)],
);

export type PracticeUser = typeof practiceUsers.$inferSelect;
export type NewPracticeUser = typeof practiceUsers.$inferInsert;
