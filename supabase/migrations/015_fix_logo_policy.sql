-- Fix the logo upload policy to properly restrict to user's own folder
DROP POLICY IF EXISTS "Users can upload their own logo" ON storage.objects;

CREATE POLICY "Users can upload their own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
