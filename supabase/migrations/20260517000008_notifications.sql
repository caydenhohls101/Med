-- ============================================================
-- MediBook SA — Notifications
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,           -- auth.users
  type        text NOT NULL,           -- booking_created | booking_cancelled | booking_confirmed | system
  title       text NOT NULL,
  body        text NOT NULL,
  href        text,                    -- where to navigate on click
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read, created_at DESC);

-- RLS: users see only their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE  ROW LEVEL SECURITY;

CREATE POLICY "notifications_select"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No INSERT for authenticated — service role creates all notifications
CREATE POLICY "notifications_no_insert"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (false);
