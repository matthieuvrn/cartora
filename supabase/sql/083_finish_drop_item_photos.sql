-- ─── Fin du retrait « photo de plat » — partie SQL-safe (2026) ───────────────
-- Remplace la partie base de 078_drop_item_photos.sql. En prod, 078 n'a jamais pu
-- s'appliquer : ses lignes 25-26 (`DELETE FROM storage.objects/buckets`) sont bloquées
-- par le trigger Supabase `storage.protect_delete` (err 42501), ce qui rollbackait toute
-- la transaction — d'où les colonnes `image_path` encore présentes en base.
--
-- Ce script ne fait QUE la partie base (idempotente, rejouable sans risque). Le bucket
-- `item-images` (vide) se supprime ENSUITE via le Dashboard Storage — jamais en SQL.
--
-- ⚠️ DESTRUCTIF : drop des colonnes image_path (aucune donnée métier — feature retirée,
-- le code ne les lit plus). À appliquer dans le SQL Editor Supabase.

-- 1. Colonnes photo (items + plats du jour)
ALTER TABLE items DROP COLUMN IF EXISTS image_path;
ALTER TABLE daily_menu_entries DROP COLUMN IF EXISTS image_path;

-- 2. Alt-texts orphelins dans translations (name/description conservés)
DELETE FROM translations WHERE field = 'altText';

-- 3. Policies RLS du bucket item-images (le bucket lui-même → Dashboard Storage)
DROP POLICY IF EXISTS "item_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "item_images_owner_delete" ON storage.objects;
