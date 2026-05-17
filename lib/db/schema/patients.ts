import {
  boolean,
  customType,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { practices } from "./practices";

// bytea type for pgsodium-encrypted ID numbers
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id")
    .notNull()
    .references(() => practices.id, { onDelete: "restrict" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  // Encrypted with pgsodium.crypto_aead_det_encrypt — decryption via SQL function
  idNumberEncrypted: bytea("id_number_encrypted"),
  // SHA-256 hex for lookup without decryption: encode(sha256(id_number::bytea), 'hex')
  idNumberHash: text("id_number_hash"),
  passportNumber: text("passport_number"),
  dateOfBirth: date("date_of_birth"),
  // CHECK constraint in SQL: ('male','female','other','unknown')
  gender: text("gender"),
  // E.164 format: +27XXXXXXXXX — validated at application layer via validateMobile()
  mobile: text("mobile").notNull(),
  email: text("email"),
  address: text("address"),
  medicalAidScheme: text("medical_aid_scheme"),
  medicalAidNumber: text("medical_aid_number"),
  medicalAidPlan: text("medical_aid_plan"),
  mainMemberName: text("main_member_name"),
  mainMemberId: text("main_member_id"),
  dependentCode: text("dependent_code"),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  // POPIA consent — captured at booking time
  popiaConsentAt: timestamp("popia_consent_at", { withTimezone: true }),
  popiaConsentVersion: text("popia_consent_version"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  // Staff notes — never exposed to patient
  notes: text("notes"),
  // Soft-delete; hard-delete only via service role + audit (POPIA erasure)
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
