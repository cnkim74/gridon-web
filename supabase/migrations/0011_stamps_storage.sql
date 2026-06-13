-- Stamps storage bucket (created via Storage REST API)
-- Bucket: stamps (public)
-- File size limit: 5MB
-- Allowed types: image/png, image/jpeg, image/webp

-- RLS policies on storage.objects for stamps bucket
CREATE POLICY "Admin upload stamps"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stamps' AND (SELECT is_admin()));

CREATE POLICY "Admin manage stamps"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'stamps' AND (SELECT is_admin()));

CREATE POLICY "Public read stamps"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stamps');

-- Logos storage bucket (created via Storage REST API)
-- Bucket: logos (public)

-- RLS policies on storage.objects for logos bucket
CREATE POLICY "Admin manage logos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'logos' AND (SELECT is_admin()))
  WITH CHECK (bucket_id = 'logos' AND (SELECT is_admin()));

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');
