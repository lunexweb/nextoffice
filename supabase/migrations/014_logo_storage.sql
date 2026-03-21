-- Add logo_url column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,  -- 2MB max
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/bmp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/bmp'];

-- Storage policies: users can upload/update/delete their own logos
CREATE POLICY "Users can upload their own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone can view logos (they're on public invoices/emails)
CREATE POLICY "Logos are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');
