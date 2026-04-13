-- ─── Bucket QR codes (public read) ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Public read: anyone can read objects from the bucket
CREATE POLICY "qr_codes_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'qr-codes');

-- Upload/update: authenticated users only
CREATE POLICY "qr_codes_authenticated_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "qr_codes_authenticated_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'qr-codes'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND auth.role() = 'authenticated'
  );
