-- Resserrer les policies d'ecriture du bucket QR :
-- seul le proprietaire du restaurant peut ecrire dans son fichier QR.
--
-- Le path dans le bucket est : qr-codes/{restaurantId}.png
-- On verifie que le nom du fichier correspond a my_restaurant_id().

-- ─── INSERT ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "qr_codes_authenticated_write" ON storage.objects;

CREATE POLICY "qr_codes_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND auth.role() = 'authenticated'
    AND name = 'qr-codes/' || my_restaurant_id()::text || '.png'
  );

-- ─── UPDATE ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "qr_codes_authenticated_update" ON storage.objects;

CREATE POLICY "qr_codes_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'qr-codes'
    AND auth.role() = 'authenticated'
    AND name = 'qr-codes/' || my_restaurant_id()::text || '.png'
  )
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND auth.role() = 'authenticated'
    AND name = 'qr-codes/' || my_restaurant_id()::text || '.png'
  );
