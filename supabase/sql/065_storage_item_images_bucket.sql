-- ─── Bucket item-images (public read, owner write/update/delete) ────────────
-- Path layout: "<restaurantId>/<itemId>.<ext>"
-- The first folder of the path must equal the caller's restaurant_id, enforced
-- via my_restaurant_id() (see 020_rls_helpers.sql).

INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- ─── SELECT — public read ───────────────────────────────────────────────────
CREATE POLICY "item_images_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'item-images');

-- ─── INSERT — owner only ────────────────────────────────────────────────────
CREATE POLICY "item_images_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'item-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  );

-- ─── UPDATE — owner only (covers upsert) ────────────────────────────────────
CREATE POLICY "item_images_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'item-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  )
  WITH CHECK (
    bucket_id = 'item-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  );

-- ─── DELETE — owner only ────────────────────────────────────────────────────
CREATE POLICY "item_images_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'item-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  );
