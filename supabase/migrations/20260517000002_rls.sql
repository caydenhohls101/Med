-- ============================================================
-- MediBook SA — Phase 1 RLS Policies
-- Migration: 0002_rls.sql
-- Depends on: 0001_schema.sql
-- ============================================================

-- ============================================================
-- SECURITY DEFINER HELPER FUNCTIONS
--
-- These functions query practice_users while bypassing its own
-- RLS policies (SECURITY DEFINER). This prevents a circular
-- evaluation when practice_users is referenced inside RLS policies
-- on other tables. Without this, Postgres would apply practice_users
-- RLS during the subquery, causing silent empty results or infinite
-- recursion.
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_practice_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT practice_id
  FROM practice_users
  WHERE user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION get_my_role(p_practice_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role::text
  FROM practice_users
  WHERE user_id = auth.uid()
    AND practice_id = p_practice_id
    AND accepted_at IS NOT NULL
  LIMIT 1;
$$;

-- ============================================================
-- ENABLE AND FORCE RLS ON ALL DOMAIN TABLES
-- FORCE ensures RLS applies even to table owners / superusers
-- (critical for POPIA tenant isolation guarantees)
-- ============================================================

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

-- ============================================================
-- PRACTICES
-- Signup uses service role (bypasses RLS) — no INSERT policy for authenticated.
-- Slug is not changeable after creation (UPDATE USING prevents slug change
-- at the DB level; application enforces this in the settings server action).
-- ============================================================

CREATE POLICY "practices_select"
  ON practices FOR SELECT TO authenticated
  USING (id IN (SELECT get_my_practice_ids()));

CREATE POLICY "practices_update_owner"
  ON practices FOR UPDATE TO authenticated
  USING  (get_my_role(id) = 'owner')
  WITH CHECK (get_my_role(id) = 'owner');

-- ============================================================
-- PRACTICE_USERS
-- SELECT: all members of any shared practice (needed for team page).
-- INSERT: owner invites (service role also inserts during signup).
-- UPDATE: user accepts own invite, OR owner changes role.
-- DELETE: owner removes team member.
-- ============================================================

CREATE POLICY "practice_users_select"
  ON practice_users FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "practice_users_owner_invite"
  ON practice_users FOR INSERT TO authenticated
  WITH CHECK (get_my_role(practice_id) = 'owner');

CREATE POLICY "practice_users_update"
  ON practice_users FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()                  -- user accepting their own invite
    OR get_my_role(practice_id) = 'owner' -- owner changing role
  )
  WITH CHECK (
    user_id = auth.uid()
    OR get_my_role(practice_id) = 'owner'
  );

CREATE POLICY "practice_users_owner_delete"
  ON practice_users FOR DELETE TO authenticated
  USING (get_my_role(practice_id) = 'owner');

-- ============================================================
-- DOCTORS
-- All members can read; owner/receptionist can write; only owner can delete
-- ============================================================

CREATE POLICY "doctors_select"
  ON doctors FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "doctors_insert"
  ON doctors FOR INSERT TO authenticated
  WITH CHECK (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) IN ('owner', 'receptionist')
  );

CREATE POLICY "doctors_update"
  ON doctors FOR UPDATE TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()))
  WITH CHECK (get_my_role(practice_id) IN ('owner', 'receptionist'));

CREATE POLICY "doctors_delete"
  ON doctors FOR DELETE TO authenticated
  USING (get_my_role(practice_id) = 'owner');

-- ============================================================
-- SERVICES
-- ============================================================

CREATE POLICY "services_select"
  ON services FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "services_insert"
  ON services FOR INSERT TO authenticated
  WITH CHECK (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) IN ('owner', 'receptionist')
  );

CREATE POLICY "services_update"
  ON services FOR UPDATE TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()))
  WITH CHECK (get_my_role(practice_id) IN ('owner', 'receptionist'));

CREATE POLICY "services_delete"
  ON services FOR DELETE TO authenticated
  USING (get_my_role(practice_id) = 'owner');

-- ============================================================
-- AVAILABILITY_RULES
-- ============================================================

CREATE POLICY "availability_rules_select"
  ON availability_rules FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "availability_rules_insert"
  ON availability_rules FOR INSERT TO authenticated
  WITH CHECK (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) IN ('owner', 'receptionist')
  );

CREATE POLICY "availability_rules_update"
  ON availability_rules FOR UPDATE TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()))
  WITH CHECK (get_my_role(practice_id) IN ('owner', 'receptionist'));

CREATE POLICY "availability_rules_delete"
  ON availability_rules FOR DELETE TO authenticated
  USING (get_my_role(practice_id) IN ('owner', 'receptionist'));

-- ============================================================
-- AVAILABILITY_EXCEPTIONS
-- ============================================================

CREATE POLICY "availability_exceptions_select"
  ON availability_exceptions FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "availability_exceptions_insert"
  ON availability_exceptions FOR INSERT TO authenticated
  WITH CHECK (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) IN ('owner', 'receptionist')
  );

CREATE POLICY "availability_exceptions_update"
  ON availability_exceptions FOR UPDATE TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()))
  WITH CHECK (get_my_role(practice_id) IN ('owner', 'receptionist'));

CREATE POLICY "availability_exceptions_delete"
  ON availability_exceptions FOR DELETE TO authenticated
  USING (get_my_role(practice_id) IN ('owner', 'receptionist'));

-- ============================================================
-- PATIENTS
-- Soft-deleted patients are invisible to authenticated queries.
-- Hard-delete (POPIA right to erasure) is service-role only:
--   - Server action writes audit_log entry, then hard-deletes.
--   - Authenticated users cannot DELETE via RLS (USING false).
-- ============================================================

CREATE POLICY "patients_select"
  ON patients FOR SELECT TO authenticated
  USING (
    practice_id IN (SELECT get_my_practice_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "patients_insert"
  ON patients FOR INSERT TO authenticated
  WITH CHECK (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) IN ('owner', 'receptionist')
  );

CREATE POLICY "patients_update"
  ON patients FOR UPDATE TO authenticated
  USING (
    practice_id IN (SELECT get_my_practice_ids())
    AND deleted_at IS NULL
  )
  WITH CHECK (get_my_role(practice_id) IN ('owner', 'receptionist'));

-- Hard-delete blocked for authenticated users; use service role + audit
CREATE POLICY "patients_no_delete"
  ON patients FOR DELETE TO authenticated
  USING (false);

-- ============================================================
-- APPOINTMENTS
-- Online booking uses service role with explicit practice_id scoping.
-- Authenticated: all roles can create/update; only owner can delete.
-- ============================================================

CREATE POLICY "appointments_select"
  ON appointments FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "appointments_insert"
  ON appointments FOR INSERT TO authenticated
  WITH CHECK (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) IN ('owner', 'doctor', 'receptionist')
  );

CREATE POLICY "appointments_update"
  ON appointments FOR UPDATE TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()))
  WITH CHECK (
    get_my_role(practice_id) IN ('owner', 'doctor', 'receptionist')
  );

CREATE POLICY "appointments_delete"
  ON appointments FOR DELETE TO authenticated
  USING (get_my_role(practice_id) = 'owner');

-- ============================================================
-- APPOINTMENT_STATUS_HISTORY
-- Read: all members. Write: service role only (via server actions).
-- ============================================================

CREATE POLICY "apt_history_select"
  ON appointment_status_history FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

-- No INSERT policy for authenticated — server actions use service role

-- ============================================================
-- COMMUNICATIONS_LOG
-- ============================================================

CREATE POLICY "comms_log_select"
  ON communications_log FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "comms_log_insert"
  ON communications_log FOR INSERT TO authenticated
  WITH CHECK (practice_id IN (SELECT get_my_practice_ids()));

-- Status updates (sent/failed from webhook processing) via service role

-- ============================================================
-- REMINDER_SCHEDULES
-- ============================================================

CREATE POLICY "reminder_schedules_select"
  ON reminder_schedules FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

CREATE POLICY "reminder_schedules_insert"
  ON reminder_schedules FOR INSERT TO authenticated
  WITH CHECK (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) IN ('owner', 'receptionist')
  );

CREATE POLICY "reminder_schedules_update"
  ON reminder_schedules FOR UPDATE TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()))
  WITH CHECK (get_my_role(practice_id) IN ('owner', 'receptionist'));

CREATE POLICY "reminder_schedules_delete"
  ON reminder_schedules FOR DELETE TO authenticated
  USING (get_my_role(practice_id) IN ('owner', 'receptionist'));

-- ============================================================
-- AUDIT_LOG
-- SELECT: owners only. No INSERT/UPDATE/DELETE for authenticated users.
-- All writes go through lib/audit/index.ts with service role.
-- ============================================================

CREATE POLICY "audit_log_select_owner"
  ON audit_log FOR SELECT TO authenticated
  USING (
    practice_id IN (SELECT get_my_practice_ids())
    AND get_my_role(practice_id) = 'owner'
  );

-- Explicitly block authenticated inserts (service role bypasses RLS)
CREATE POLICY "audit_log_no_insert"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (false);

-- ============================================================
-- SUBSCRIPTIONS
-- Read: all members (needed to check trial status in UI).
-- Write: service role only (Paystack webhooks, Phase 3).
-- ============================================================

CREATE POLICY "subscriptions_select"
  ON subscriptions FOR SELECT TO authenticated
  USING (practice_id IN (SELECT get_my_practice_ids()));

-- ============================================================
-- WEBHOOK_EVENTS
-- Internal; processed by Edge Functions with service role only.
-- No authenticated access.
-- ============================================================

CREATE POLICY "webhook_events_no_access"
  ON webhook_events FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
