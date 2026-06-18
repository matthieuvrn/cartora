-- 077: Multilingue (S4) — CONTRACT / cleanup destructif.
--
-- ⚠️ À APPLIQUER UNIQUEMENT après que 076 + le code S4 tournent en prod ET que le
-- backfill des hashes a été exécuté, ET après vérification de parité colonnes ↔ lignes
-- translations (cf. requêtes de pré-vol en fin de fichier). Cette migration retire les
-- colonnes legacy et resserre le CHECK — irréversible.
--
-- Pré-requis : le code déployé n'écrit plus QUE des locales minuscules (la fenêtre 076
-- est close) et ne lit plus les colonnes name_fr/name_en/… (dual-write supprimé côté
-- repo dans le même déploiement que 077).
--
-- À appliquer manuellement dans le Supabase SQL Editor.

BEGIN;

-- 1. Normaliser les éventuelles lignes 'FR'/'EN' écrites pendant la fenêtre 076.
UPDATE translations SET locale = lower(locale) WHERE locale <> lower(locale);

-- 2. Resserrer le CHECK locale : minuscules uniquement (retire la tolérance 'FR'/'EN').
ALTER TABLE translations DROP CONSTRAINT IF EXISTS translations_locale_check;
ALTER TABLE translations ADD CONSTRAINT translations_locale_check
  CHECK (locale IN ('fr', 'en', 'es', 'de', 'it'));

-- 3. Drop des colonnes bilingues legacy — la table `translations` est désormais la
--    source de vérité unique (y compris langue source).
ALTER TABLE daily_menu_entries
  DROP COLUMN name_fr,
  DROP COLUMN name_en,
  DROP COLUMN description_fr,
  DROP COLUMN description_en,
  DROP COLUMN alt_text_fr,
  DROP COLUMN alt_text_en;

ALTER TABLE formulas
  DROP COLUMN name_fr,
  DROP COLUMN name_en,
  DROP COLUMN description_fr,
  DROP COLUMN description_en;

ALTER TABLE items
  DROP COLUMN alt_text_fr,
  DROP COLUMN alt_text_en;

-- 4. Le type enum `entity_type` (devenu TEXT en 076) peut désormais être supprimé s'il
--    traîne encore (no-op si déjà DROP en 076).
DROP TYPE IF EXISTS "entity_type";

COMMIT;

-- ─── Pré-vol (à exécuter AVANT, doivent tous retourner 0) ───────────────────────
--
-- Parité daily dishes :
--   SELECT count(*) FROM daily_menu_entries d
--   LEFT JOIN translations t ON t.entity_id = d.id AND t.entity_type = 'DAILY_DISH'
--     AND t.field = 'name' AND t.locale = 'fr'
--   WHERE t.value IS DISTINCT FROM d.name_fr;
--
-- Parité formules :
--   SELECT count(*) FROM formulas f
--   LEFT JOIN translations t ON t.entity_id = f.id AND t.entity_type = 'FORMULA'
--     AND t.field = 'name' AND t.locale = 'fr'
--   WHERE t.value IS DISTINCT FROM f.name_fr;
--
-- Parité alt-texts items (uniquement ceux non vides) :
--   SELECT count(*) FROM items i
--   LEFT JOIN translations t ON t.entity_id = i.id AND t.entity_type = 'ITEM'
--     AND t.field = 'altText' AND t.locale = 'fr'
--   WHERE coalesce(i.alt_text_fr, '') <> '' AND t.value IS DISTINCT FROM i.alt_text_fr;
