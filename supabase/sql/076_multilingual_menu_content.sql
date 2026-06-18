-- 076: Multilingue (S4) — généralisation de `translations` + langues par restaurant.
--
-- Ce que fait cette migration :
--   1. `restaurants` : +`source_locale` (langue de saisie, défaut 'fr') et
--      +`menu_locales` (langues cibles activées, TEXT[]).
--   2. `translations.locale` et `translations.entity_type` passent d'enum à TEXT
--      (codes ISO minuscules ; entity types ITEM/CATEGORY/DAILY_DISH/FORMULA).
--      +`source_text_hash` (fraîcheur des traductions, posé par l'app).
--   3. Backfill : les colonnes bilingues de `daily_menu_entries`/`formulas` et les
--      alt-texts (`items`, `daily_menu_entries`) deviennent des lignes `translations`.
--   4. Grandfathering : les restaurants ayant déjà des traductions EN gardent
--      l'anglais activé (`menu_locales = {en}`).
--
-- ⚠️ Fenêtre de déploiement : après application, l'ancien code déployé lit encore
-- locale 'FR'/'EN' (majuscules) → les noms d'items paraissent vides dans le DASHBOARD
-- (le menu public lit les snapshots, non affecté). Appliquer puis déployer aussitôt.
-- Le CHECK transitoire tolère les écritures 'FR'/'EN' de l'ancien code ; la
-- normalisation finale + DROP des enums morts se fait en 077.
--
-- Idempotence : rejouable en entier UNE fois posée ; après le déploiement du nouveau
-- code, ne rejouer QUE la section 3 (backfill, ON CONFLICT DO NOTHING) pour rattraper
-- les lignes écrites pendant la fenêtre.
--
-- NOTE: le type enum "locale" est CONSERVÉ — encore utilisé par menu_view_events,
-- menu_view_daily_stats et landing_events (analytics, chrome fr/en uniquement).
-- À appliquer manuellement dans le Supabase SQL Editor.

BEGIN;

-- ─── 1. restaurants : langue source + langues cibles ────────────────────────────

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS source_locale TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS menu_locales TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_source_locale_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_source_locale_check
  CHECK (source_locale IN ('fr', 'en', 'es', 'de', 'it'));

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_menu_locales_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_menu_locales_check
  CHECK (menu_locales <@ ARRAY['fr', 'en', 'es', 'de', 'it']::text[]);

-- ─── 2. translations : enums → TEXT + hash de fraîcheur ─────────────────────────

-- `lower(...::text)` fonctionne que la colonne soit encore enum ou déjà TEXT (re-run).
ALTER TABLE translations ALTER COLUMN locale TYPE TEXT USING (lower(locale::text));
ALTER TABLE translations ALTER COLUMN entity_type TYPE TEXT USING (entity_type::text);

-- Valeurs mortes de l'enum entity_type (jamais écrites par l'app) + lignes vides :
-- une valeur vide signifie « pas de traduction » (missing), pas une donnée.
DELETE FROM translations WHERE entity_type IN ('RESTAURANT', 'MENU');
DELETE FROM translations WHERE btrim(value) = '';

ALTER TABLE translations ADD COLUMN IF NOT EXISTS source_text_hash TEXT;

-- CHECK transitoire : tolère 'FR'/'EN' écrits par l'ancien code encore déployé
-- pendant la fenêtre. Resserré en 077 (minuscules uniquement).
ALTER TABLE translations DROP CONSTRAINT IF EXISTS translations_locale_check;
ALTER TABLE translations ADD CONSTRAINT translations_locale_check
  CHECK (locale IN ('fr', 'en', 'es', 'de', 'it', 'FR', 'EN'));

ALTER TABLE translations DROP CONSTRAINT IF EXISTS translations_entity_type_check;
ALTER TABLE translations ADD CONSTRAINT translations_entity_type_check
  CHECK (entity_type IN ('ITEM', 'CATEGORY', 'DAILY_DISH', 'FORMULA'));

-- Le DROP TYPE entity_type est différé en 077 : l'ancien client Prisma déployé peut
-- encore référencer le type pendant la fenêtre de déploiement.

-- ─── 3. Backfill colonnes bilingues → lignes translations (rejouable) ───────────

-- Plats du jour : name/description, fr (source) + en (si non vide)
INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'DAILY_DISH', d.id, 'name', 'fr', d.name_fr, d.restaurant_id, now(), now()
FROM daily_menu_entries d WHERE btrim(d.name_fr) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'DAILY_DISH', d.id, 'description', 'fr', d.description_fr, d.restaurant_id, now(), now()
FROM daily_menu_entries d WHERE btrim(d.description_fr) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'DAILY_DISH', d.id, 'name', 'en', d.name_en, d.restaurant_id, now(), now()
FROM daily_menu_entries d WHERE btrim(d.name_en) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'DAILY_DISH', d.id, 'description', 'en', d.description_en, d.restaurant_id, now(), now()
FROM daily_menu_entries d WHERE btrim(d.description_en) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

-- Formules : name/description, fr + en
INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'FORMULA', f.id, 'name', 'fr', f.name_fr, f.restaurant_id, now(), now()
FROM formulas f WHERE btrim(f.name_fr) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'FORMULA', f.id, 'description', 'fr', f.description_fr, f.restaurant_id, now(), now()
FROM formulas f WHERE btrim(f.description_fr) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'FORMULA', f.id, 'name', 'en', f.name_en, f.restaurant_id, now(), now()
FROM formulas f WHERE btrim(f.name_en) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'FORMULA', f.id, 'description', 'en', f.description_en, f.restaurant_id, now(), now()
FROM formulas f WHERE btrim(f.description_en) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

-- Alt-texts photos : items + plats du jour (field 'altText')
INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ITEM', i.id, 'altText', 'fr', i.alt_text_fr, i.restaurant_id, now(), now()
FROM items i WHERE i.alt_text_fr IS NOT NULL AND btrim(i.alt_text_fr) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'ITEM', i.id, 'altText', 'en', i.alt_text_en, i.restaurant_id, now(), now()
FROM items i WHERE i.alt_text_en IS NOT NULL AND btrim(i.alt_text_en) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'DAILY_DISH', d.id, 'altText', 'fr', d.alt_text_fr, d.restaurant_id, now(), now()
FROM daily_menu_entries d WHERE d.alt_text_fr IS NOT NULL AND btrim(d.alt_text_fr) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

INSERT INTO translations (id, entity_type, entity_id, field, locale, value, restaurant_id, created_at, updated_at)
SELECT gen_random_uuid(), 'DAILY_DISH', d.id, 'altText', 'en', d.alt_text_en, d.restaurant_id, now(), now()
FROM daily_menu_entries d WHERE d.alt_text_en IS NOT NULL AND btrim(d.alt_text_en) <> ''
ON CONFLICT (entity_type, entity_id, field, locale) DO NOTHING;

-- ─── 4. Grandfathering : menus déjà bilingues gardent l'anglais activé ──────────

UPDATE restaurants r
SET menu_locales = ARRAY['en']
WHERE r.menu_locales = '{}'
  AND EXISTS (
    SELECT 1 FROM translations t
    WHERE t.restaurant_id = r.id AND t.locale = 'en' AND btrim(t.value) <> ''
  );

COMMIT;
