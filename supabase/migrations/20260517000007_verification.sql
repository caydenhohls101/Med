-- ============================================================
-- MediBook SA — Practice Verification
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS is_verified   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by   uuid;   -- platform admin user_id

CREATE INDEX IF NOT EXISTS idx_practices_verified ON practices(is_verified) WHERE is_verified = true;
