-- ─── Retrait total de la feature « photo de plat » (2026) ───────────────────
-- Décision produit : Cartora devient un menu digital sans photos de plats.
-- On supprime les colonnes image_path (items + plats du jour), les alt-texts
-- résiduels dans `translations`, et le bucket `item-images` (partagé items +
-- plats du jour) avec ses 4 policies RLS (cf. 065_storage_item_images_bucket.sql).
--
-- ⚠️ DESTRUCTIF ET IRRÉVERSIBLE : supprime toutes les photos stockées.
-- À appliquer manuellement dans le SQL Editor Supabase APRÈS déploiement du code
-- (le code ne lit plus ces colonnes ni ce bucket ; l'ordre inverse casserait la lecture).
-- Le logo restaurant (`restaurant-logos`) et les QR (`qr-codes`) ne sont PAS touchés.

-- 1. Colonnes photo
ALTER TABLE items DROP COLUMN IF EXISTS image_path;
ALTER TABLE daily_menu_entries DROP COLUMN IF EXISTS image_path;

-- 2. Alt-texts orphelins (les autres champs — name/description — restent)
DELETE FROM translations WHERE field = 'altText';

-- 3. Bucket item-images : policies, objets, puis le bucket lui-même
DROP POLICY IF EXISTS "item_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_delete" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'item-images';
DELETE FROM storage.buckets WHERE id = 'item-images';
