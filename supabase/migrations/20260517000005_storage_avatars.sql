-- ============================================================
-- MediBook SA — Avatar Storage Bucket
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Create public avatars bucket (safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,            -- 2 MB max
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Avatars public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Users can upload / overwrite their own avatar (file name = user id)
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND name = auth.uid()::text);
