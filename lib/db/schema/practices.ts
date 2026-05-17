import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { subscriptionPlanEnum, subscriptionStatusEnum } from "./enums";

export const practices = pgTable("practices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  suburb: text("suburb").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  postalCode: text("postal_code").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  logoUrl: text("logo_url"),
  brandColor: text("brand_color").notNull().default("#2563EB"),
  timezone: text("timezone").notNull().default("Africa/Johannesburg"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .notNull()
    .default("trial"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan")
    .notNull()
    .default("starter"),
  // Keys: auto_confirm bool, booking_open bool,
  //       booking_notice_hours int, max_advance_days int
  settings: jsonb("settings").notNull().default({
    auto_confirm: false,
    booking_open: true,
    booking_notice_hours: 2,
    max_advance_days: 60,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Practice = typeof practices.$inferSelect;
export type NewPractice = typeof practices.$inferInsert;

export type PracticeSettings = {
  auto_confirm: boolean;
  booking_open: boolean;
  booking_notice_hours: number;
  max_advance_days: number;
};
