-- ─── Logo restaurant (S2.3) ────────────────────────────────────────────────
-- Colonne logo_path sur restaurants + bucket Supabase Storage dédié.
-- Path layout : "<restaurantId>/logo.<ext>" — un seul logo par restaurant
-- (les ré-uploads écrasent via upsert). Le first folder du path doit égaler
-- le my_restaurant_id() de l'appelant, comme pour item-images.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

-- ─── Bucket restaurant-logos (public read, owner write/update/delete) ──────

INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "restaurant_logos_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'restaurant-logos');

CREATE POLICY "restaurant_logos_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  );

CREATE POLICY "restaurant_logos_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'restaurant-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  )
  WITH CHECK (
    bucket_id = 'restaurant-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  );

CREATE POLICY "restaurant_logos_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'restaurant-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = my_restaurant_id()::text
  );
