-- ============================================================
-- MediBook SA — Full Reset + Migrate
-- Run this in: Supabase Dashboard → SQL Editor
-- Safe to run on a fresh/partial setup with no real data.
-- ============================================================

-- ============================================================
-- STEP 1: DROP EVERYTHING (reverse dependency order)
-- ============================================================

DROP TABLE IF EXISTS webhook_events              CASCADE;
DROP TABLE IF EXISTS subscriptions               CASCADE;
DROP TABLE IF EXISTS audit_log                   CASCADE;
DROP TABLE IF EXISTS reminder_schedules          CASCADE;
DROP TABLE IF EXISTS communications_log          CASCADE;
DROP TABLE IF EXISTS appointment_status_history  CASCADE;
DROP TABLE IF EXISTS appointments                CASCADE;
DROP TABLE IF EXISTS patients                    CASCADE;
DROP TABLE IF EXISTS availability_exceptions     CASCADE;
DROP TABLE IF EXISTS availability_rules          CASCADE;
DROP TABLE IF EXISTS services                    CASCADE;
DROP TABLE IF EXISTS doctors                     CASCADE;
DROP TABLE IF EXISTS practice_users              CASCADE;
DROP TABLE IF EXISTS practices                   CASCADE;

DROP FUNCTION IF EXISTS get_my_practice_ids()   CASCADE;
DROP FUNCTION IF EXISTS get_my_role(uuid)        CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()         CASCADE;

DROP TYPE IF EXISTS subscription_status_enum     CASCADE;
DROP TYPE IF EXISTS subscription_plan_enum       CASCADE;
DROP TYPE IF EXISTS user_role_enum               CASCADE;
DROP TYPE IF EXISTS appointment_status_enum      CASCADE;
DROP TYPE IF EXISTS appointment_source_enum      CASCADE;
DROP TYPE IF EXISTS availability_exception_type_enum CASCADE;
DROP TYPE IF EXISTS communication_channel_enum   CASCADE;
DROP TYPE IF EXISTS communication_direction_enum CASCADE;
DROP TYPE IF EXISTS communication_status_enum    CASCADE;
DROP TYPE IF EXISTS communication_provider_enum  CASCADE;

-- ============================================================
-- STEP 2: SCHEMA (from 0001_schema.sql)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pgsodium";

-- Enums
CREATE TYPE subscription_status_enum AS ENUM ('trial','active','past_due','cancelled');
CREATE TYPE subscription_plan_enum   AS ENUM ('starter','practice','group');
CREATE TYPE user_role_enum           AS ENUM ('owner','doctor','receptionist');
CREATE TYPE appointment_status_enum  AS ENUM ('pending','confirmed','cancelled','completed','no_show');
CREATE TYPE appointment_source_enum  AS ENUM ('online','phone','walk_in','admin');
CREATE TYPE availability_exception_type_enum AS ENUM ('unavailable','available');
CREATE TYPE communication_channel_enum   AS ENUM ('whatsapp','email','sms');
CREATE TYPE communication_direction_enum AS ENUM ('outbound','inbound');
CREATE TYPE communication_status_enum    AS ENUM ('queued','sent','delivered','read','failed');
CREATE TYPE communication_provider_enum  AS ENUM ('resend','360dialog','twilio');

-- Trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Practices
CREATE TABLE practices (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  slug                 text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  address_line1        text NOT NULL,
  address_line2        text,
  suburb               text NOT NULL,
  city                 text NOT NULL,
  province             text NOT NULL CHECK (province IN (
    'Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape',
    'Free State','Limpopo','Mpumalanga','North West','Northern Cape'
  )),
  postal_code          text NOT NULL CHECK (postal_code ~ '^\d{4}$'),
  phone                text NOT NULL,
  email                text NOT NULL,
  logo_url             text,
  brand_color          text NOT NULL DEFAULT '#2563EB' CHECK (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  timezone             text NOT NULL DEFAULT 'Africa/Johannesburg',
  trial_ends_at        timestamptz NOT NULL,
  subscription_status  subscription_status_enum NOT NULL DEFAULT 'trial',
  subscription_plan    subscription_plan_enum   NOT NULL DEFAULT 'starter',
  settings             jsonb NOT NULL DEFAULT '{"auto_confirm":false,"booking_open":true,"booking_notice_hours":2,"max_advance_days":60}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER practices_updated_at BEFORE UPDATE ON practices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Practice users
CREATE TABLE practice_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  role         user_role_enum NOT NULL,
  invited_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practice_id, user_id)
);
CREATE TRIGGER practice_users_updated_at BEFORE UPDATE ON practice_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_practice_users_user_id ON practice_users(user_id);

-- Doctors
CREATE TABLE doctors (
  id                                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id                           uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id                               uuid,
  full_name                             text NOT NULL,
  title                                 text NOT NULL DEFAULT 'Dr' CHECK (title IN ('Dr','Prof','Mr','Mrs','Ms','Sister','Adv')),
  hpcsa_number                          text,
  specialty                             text,
  bio                                   text,
  photo_url                             text,
  default_appointment_duration_minutes  integer NOT NULL DEFAULT 15 CHECK (default_appointment_duration_minutes > 0),
  buffer_minutes                        integer NOT NULL DEFAULT 0   CHECK (buffer_minutes >= 0),
  color                                 text NOT NULL DEFAULT '#2563EB' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  active                                boolean NOT NULL DEFAULT true,
  created_at                            timestamptz NOT NULL DEFAULT now(),
  updated_at                            timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_doctors_practice_active ON doctors(practice_id, active);

-- Services
CREATE TABLE services (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id        uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  doctor_id          uuid REFERENCES doctors(id) ON DELETE SET NULL,
  name               text NOT NULL,
  duration_minutes   integer NOT NULL CHECK (duration_minutes > 0),
  price_cents        integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  requires_referral  boolean NOT NULL DEFAULT false,
  description        text,
  active             boolean NOT NULL DEFAULT true,
  display_order      integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_services_practice_active ON services(practice_id, active);

-- Availability rules
CREATE TABLE availability_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id     uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week     smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  effective_from  date NOT NULL,
  effective_to    date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time),
  CHECK (effective_to IS NULL OR effective_from <= effective_to)
);
CREATE TRIGGER availability_rules_updated_at BEFORE UPDATE ON availability_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_avail_rules_doctor_day ON availability_rules(doctor_id, day_of_week);

-- Availability exceptions
CREATE TABLE availability_exceptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  doctor_id    uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date         date NOT NULL,
  start_time   time,
  end_time     time,
  type         availability_exception_type_enum NOT NULL,
  reason       text,
  full_day     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (full_day = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
);
CREATE TRIGGER availability_exceptions_updated_at BEFORE UPDATE ON availability_exceptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_avail_exceptions_doctor_date ON availability_exceptions(doctor_id, date);

-- Patients
CREATE TABLE patients (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id           uuid NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
  first_name            text NOT NULL,
  last_name             text NOT NULL,
  id_number_encrypted   bytea,
  id_number_hash        text,
  passport_number       text,
  date_of_birth         date,
  gender                text CHECK (gender IN ('male','female','other','unknown')),
  mobile                text NOT NULL CHECK (mobile ~ '^\+[1-9]\d{6,14}$'),
  email                 text,
  address               text,
  medical_aid_scheme    text,
  medical_aid_number    text,
  medical_aid_plan      text,
  main_member_name      text,
  main_member_id        text,
  dependent_code        text,
  allergies             text,
  chronic_conditions    text,
  popia_consent_at      timestamptz,
  popia_consent_version text,
  marketing_consent     boolean NOT NULL DEFAULT false,
  notes                 text,
  deleted_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_patients_practice_mobile    ON patients(practice_id, mobile)          WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_practice_id_hash   ON patients(practice_id, id_number_hash)  WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_practice_last_name ON patients(practice_id, last_name)        WHERE deleted_at IS NULL;

-- Appointments
CREATE TABLE appointments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id           uuid NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
  doctor_id             uuid NOT NULL REFERENCES doctors(id)   ON DELETE RESTRICT,
  service_id            uuid NOT NULL REFERENCES services(id)  ON DELETE RESTRICT,
  patient_id            uuid NOT NULL REFERENCES patients(id)  ON DELETE RESTRICT,
  starts_at             timestamptz NOT NULL,
  ends_at               timestamptz NOT NULL,
  status                appointment_status_enum NOT NULL DEFAULT 'pending',
  source                appointment_source_enum NOT NULL DEFAULT 'online',
  reference_number      text NOT NULL UNIQUE,
  notes                 text,
  internal_notes        text,
  cancelled_at          timestamptz,
  cancelled_by_user_id  uuid,
  cancel_reason         text,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at),
  EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('pending','confirmed'))
);
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_appointments_practice_starts ON appointments(practice_id, starts_at);
CREATE INDEX idx_appointments_doctor_starts   ON appointments(doctor_id,   starts_at);
CREATE INDEX idx_appointments_patient_starts  ON appointments(patient_id,  starts_at);
CREATE INDEX idx_appointments_status          ON appointments(status);

-- Appointment status history
CREATE TABLE appointment_status_history (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id          uuid NOT NULL REFERENCES practices(id)    ON DELETE CASCADE,
  appointment_id       uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_status          appointment_status_enum,
  to_status            appointment_status_enum NOT NULL,
  changed_by_user_id   uuid,
  changed_at           timestamptz NOT NULL DEFAULT now(),
  reason               text
);
CREATE INDEX idx_apt_history_appointment ON appointment_status_history(appointment_id, changed_at DESC);

-- Communications log
CREATE TABLE communications_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id          uuid NOT NULL REFERENCES practices(id)   ON DELETE RESTRICT,
  patient_id           uuid REFERENCES patients(id)             ON DELETE SET NULL,
  appointment_id       uuid REFERENCES appointments(id)         ON DELETE SET NULL,
  channel              communication_channel_enum NOT NULL,
  direction            communication_direction_enum NOT NULL DEFAULT 'outbound',
  template_name        text NOT NULL,
  status               communication_status_enum NOT NULL DEFAULT 'queued',
  provider             communication_provider_enum NOT NULL,
  provider_message_id  text,
  error_code           text,
  error_message        text,
  payload              jsonb,
  scheduled_for        timestamptz,
  sent_at              timestamptz,
  retry_count          integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER communications_log_updated_at BEFORE UPDATE ON communications_log FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE UNIQUE INDEX idx_comms_log_idempotency ON communications_log(appointment_id, template_name, channel) WHERE appointment_id IS NOT NULL;
CREATE INDEX idx_comms_log_queued ON communications_log(practice_id, scheduled_for) WHERE status = 'queued';

-- Reminder schedules
CREATE TABLE reminder_schedules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id         uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  channel             communication_channel_enum NOT NULL,
  hours_before        integer NOT NULL CHECK (hours_before > 0),
  template_name       text NOT NULL,
  enabled             boolean NOT NULL DEFAULT true,
  applies_to_status   text[] NOT NULL DEFAULT ARRAY['confirmed'],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER reminder_schedules_updated_at BEFORE UPDATE ON reminder_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_reminder_schedules_practice_enabled ON reminder_schedules(practice_id) WHERE enabled = true;

-- Audit log
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid REFERENCES practices(id) ON DELETE SET NULL,
  user_id      uuid,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_practice_created ON audit_log(practice_id, created_at DESC);
CREATE INDEX idx_audit_log_entity           ON audit_log(entity_type, entity_id);

-- Subscriptions
CREATE TABLE subscriptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id                 uuid NOT NULL UNIQUE REFERENCES practices(id) ON DELETE RESTRICT,
  plan                        subscription_plan_enum   NOT NULL,
  status                      subscription_status_enum NOT NULL,
  current_period_start        timestamptz NOT NULL,
  current_period_end          timestamptz NOT NULL,
  paystack_subscription_code  text,
  paystack_customer_code      text,
  cancelled_at                timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Webhook events
CREATE TABLE webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL,
  external_id   text NOT NULL,
  payload       jsonb NOT NULL,
  processed_at  timestamptz,
  error         text,
  retry_count   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);
CREATE TRIGGER webhook_events_updated_at BEFORE UPDATE ON webhook_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- STEP 3: RLS (from 0002_rls.sql)
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_practice_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp AS $$
  SELECT practice_id FROM practice_users WHERE user_id = auth.uid() AND accepted_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION get_my_role(p_practice_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp AS $$
  SELECT role::text FROM practice_users
  WHERE user_id = auth.uid() AND practice_id = p_practice_id AND accepted_at IS NOT NULL
  LIMIT 1;
$$;

ALTER TABLE practices                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events              ENABLE ROW LEVEL SECURITY;

ALTER TABLE practices                   FORCE ROW LEVEL SECURITY;
ALTER TABLE practice_users              FORCE ROW LEVEL SECURITY;
ALTER TABLE doctors                     FORCE ROW LEVEL SECURITY;
ALTER TABLE services                    FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_rules          FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions     FORCE ROW LEVEL SECURITY;
ALTER TABLE patients                    FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments                FORCE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history  FORCE ROW LEVEL SECURITY;
ALTER TABLE communications_log          FORCE ROW LEVEL SECURITY;
ALTER TABLE reminder_schedules          FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log                   FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions               FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_events              FORCE ROW LEVEL SECURITY;

-- Practices
CREATE POLICY "practices_select"       ON practices FOR SELECT TO authenticated USING (id IN (SELECT get_my_practice_ids()));
CREATE POLICY "practices_update_owner" ON practices FOR UPDATE TO authenticated USING (get_my_role(id) = 'owner') WITH CHECK (get_my_role(id) = 'owner');

-- Practice users
CREATE POLICY "practice_users_select"       ON practice_users FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "practice_users_owner_invite" ON practice_users FOR INSERT TO authenticated WITH CHECK (get_my_role(practice_id) = 'owner');
CREATE POLICY "practice_users_update"       ON practice_users FOR UPDATE TO authenticated USING (user_id = auth.uid() OR get_my_role(practice_id) = 'owner') WITH CHECK (user_id = auth.uid() OR get_my_role(practice_id) = 'owner');
CREATE POLICY "practice_users_owner_delete" ON practice_users FOR DELETE TO authenticated USING (get_my_role(practice_id) = 'owner');

-- Doctors
CREATE POLICY "doctors_select" ON doctors FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "doctors_insert" ON doctors FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "doctors_update" ON doctors FOR UPDATE TO authenticated USING (practice_id IN (SELECT get_my_practice_ids())) WITH CHECK (get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "doctors_delete" ON doctors FOR DELETE TO authenticated USING (get_my_role(practice_id) = 'owner');

-- Services
CREATE POLICY "services_select" ON services FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "services_insert" ON services FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "services_update" ON services FOR UPDATE TO authenticated USING (practice_id IN (SELECT get_my_practice_ids())) WITH CHECK (get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "services_delete" ON services FOR DELETE TO authenticated USING (get_my_role(practice_id) = 'owner');

-- Availability rules
CREATE POLICY "availability_rules_select" ON availability_rules FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "availability_rules_insert" ON availability_rules FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "availability_rules_update" ON availability_rules FOR UPDATE TO authenticated USING (practice_id IN (SELECT get_my_practice_ids())) WITH CHECK (get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "availability_rules_delete" ON availability_rules FOR DELETE TO authenticated USING (get_my_role(practice_id) IN ('owner','receptionist'));

-- Availability exceptions
CREATE POLICY "availability_exceptions_select" ON availability_exceptions FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "availability_exceptions_insert" ON availability_exceptions FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "availability_exceptions_update" ON availability_exceptions FOR UPDATE TO authenticated USING (practice_id IN (SELECT get_my_practice_ids())) WITH CHECK (get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "availability_exceptions_delete" ON availability_exceptions FOR DELETE TO authenticated USING (get_my_role(practice_id) IN ('owner','receptionist'));

-- Patients
CREATE POLICY "patients_select"    ON patients FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()) AND deleted_at IS NULL);
CREATE POLICY "patients_insert"    ON patients FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "patients_update"    ON patients FOR UPDATE TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()) AND deleted_at IS NULL) WITH CHECK (get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "patients_no_delete" ON patients FOR DELETE TO authenticated USING (false);

-- Appointments
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) IN ('owner','doctor','receptionist'));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated USING (practice_id IN (SELECT get_my_practice_ids())) WITH CHECK (get_my_role(practice_id) IN ('owner','doctor','receptionist'));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated USING (get_my_role(practice_id) = 'owner');

-- Appointment status history
CREATE POLICY "apt_history_select" ON appointment_status_history FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));

-- Communications log
CREATE POLICY "comms_log_select" ON communications_log FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "comms_log_insert" ON communications_log FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()));

-- Reminder schedules
CREATE POLICY "reminder_schedules_select" ON reminder_schedules FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));
CREATE POLICY "reminder_schedules_insert" ON reminder_schedules FOR INSERT TO authenticated WITH CHECK (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "reminder_schedules_update" ON reminder_schedules FOR UPDATE TO authenticated USING (practice_id IN (SELECT get_my_practice_ids())) WITH CHECK (get_my_role(practice_id) IN ('owner','receptionist'));
CREATE POLICY "reminder_schedules_delete" ON reminder_schedules FOR DELETE TO authenticated USING (get_my_role(practice_id) IN ('owner','receptionist'));

-- Audit log
CREATE POLICY "audit_log_select_owner" ON audit_log FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()) AND get_my_role(practice_id) = 'owner');
CREATE POLICY "audit_log_no_insert"    ON audit_log FOR INSERT TO authenticated WITH CHECK (false);

-- Subscriptions
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT TO authenticated USING (practice_id IN (SELECT get_my_practice_ids()));

-- Webhook events (internal only)
CREATE POLICY "webhook_events_no_access" ON webhook_events FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ============================================================
-- Done. All tables, RLS policies, and helper functions created.
-- ============================================================
