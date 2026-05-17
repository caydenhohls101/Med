-- ============================================================
-- MediBook SA — Performance Indexes
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── RLS helper function speed-up ──────────────────────────────
-- get_my_practice_ids() and get_my_role() are called on EVERY
-- RLS evaluation for every query. A partial composite index on
-- the accepted rows makes these sub-millisecond.
CREATE INDEX IF NOT EXISTS idx_practice_users_rls
  ON practice_users(user_id, practice_id)
  WHERE accepted_at IS NOT NULL;

-- ── Practice browsing ──────────────────────────────────────────
-- Public /browse page filters and sorts by city/province
CREATE INDEX IF NOT EXISTS idx_practices_city     ON practices(city);
CREATE INDEX IF NOT EXISTS idx_practices_province ON practices(province);

-- Map query filters on coordinates being non-null
CREATE INDEX IF NOT EXISTS idx_practices_coords
  ON practices(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ── Patient deduplication ──────────────────────────────────────
-- createBooking() looks up existing patient by practice + email
CREATE INDEX IF NOT EXISTS idx_patients_email
  ON patients(practice_id, email)
  WHERE deleted_at IS NULL;

-- ── Appointment dashboard queries ──────────────────────────────
-- Today's view: practice + date range (status is a bonus)
CREATE INDEX IF NOT EXISTS idx_appointments_practice_status_starts
  ON appointments(practice_id, status, starts_at);

-- Booking slot check: doctor on a specific day
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status_starts
  ON appointments(doctor_id, status, starts_at)
  WHERE status IN ('pending', 'confirmed');

-- ── Doctors and services list queries ─────────────────────────
-- Already have idx_doctors_practice_active and idx_services_practice_active
-- Add covering index for the browse detail page join
CREATE INDEX IF NOT EXISTS idx_doctors_user_id
  ON doctors(user_id)
  WHERE user_id IS NOT NULL;

-- ── Communications worker ──────────────────────────────────────
-- Already have idx_comms_log_queued — add appointment lookup
CREATE INDEX IF NOT EXISTS idx_comms_log_appointment
  ON communications_log(appointment_id)
  WHERE appointment_id IS NOT NULL;
