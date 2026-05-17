import { pgEnum } from "drizzle-orm/pg-core";

export const subscriptionStatusEnum = pgEnum("subscription_status_enum", [
  "trial",
  "active",
  "past_due",
  "cancelled",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan_enum", [
  "starter",
  "practice",
  "group",
]);

export const userRoleEnum = pgEnum("user_role_enum", [
  "owner",
  "doctor",
  "receptionist",
]);

export const appointmentStatusEnum = pgEnum("appointment_status_enum", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const appointmentSourceEnum = pgEnum("appointment_source_enum", [
  "online",
  "phone",
  "walk_in",
  "admin",
]);

export const availabilityExceptionTypeEnum = pgEnum(
  "availability_exception_type_enum",
  ["unavailable", "available"],
);

export const communicationChannelEnum = pgEnum("communication_channel_enum", [
  "whatsapp",
  "email",
  "sms",
]);

export const communicationDirectionEnum = pgEnum(
  "communication_direction_enum",
  ["outbound", "inbound"],
);

export const communicationStatusEnum = pgEnum("communication_status_enum", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const communicationProviderEnum = pgEnum("communication_provider_enum", [
  "resend",
  "360dialog",
  "twilio",
]);
