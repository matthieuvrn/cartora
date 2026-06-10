-- 074: Refonte du set de templates publics (2026).
-- Retire ELEGANT/MODERN, ajoute CARTORA + 5 premium (BISTRO/NOIR/SOLAR/ZEN/NEON).
-- Postgres n'autorise pas le retrait direct d'une valeur d'enum en usage → on recrée le type.
--
-- Ordre critique :
--   1. Remap des données AVANT le swap de type (sinon le cast échoue sur ELEGANT/MODERN).
--   2. DROP DEFAULT avant l'ALTER TYPE (le DEFAULT 'CLASSIC'::menu_template ne peut pas
--      être casté pendant le changement de type) — puis SET DEFAULT après le rename.
-- Snapshots : pas de réécriture JSON nécessaire — le renderer retombe sur CLASSIC pour
-- toute valeur inconnue (cf. MenuTemplateRenderer / `requested in TEMPLATE_REGISTRY`).
-- À appliquer manuellement dans le Supabase SQL Editor.

BEGIN;

-- 1. Remap des menus encore sur les anciens designs.
-- Cast `::text` (et non comparaison enum directe) → idempotent : un 2e passage, où l'enum ne
-- contient plus 'ELEGANT'/'MODERN', matche 0 ligne au lieu de planter (`invalid input value for enum`).
UPDATE menus SET template = 'CLASSIC' WHERE template::text IN ('ELEGANT', 'MODERN');

-- 2. Retirer le DEFAULT (incastable pendant l'ALTER TYPE)
ALTER TABLE menus ALTER COLUMN template DROP DEFAULT;

-- 3. Nouveau type avec le set 2026
DROP TYPE IF EXISTS menu_template_new;
CREATE TYPE menu_template_new AS ENUM
  ('CLASSIC', 'CARTORA', 'BISTRO', 'NOIR', 'SOLAR', 'ZEN', 'NEON');

-- 4. Bascule de la colonne sur le nouveau type
ALTER TABLE menus
  ALTER COLUMN template TYPE menu_template_new
  USING (template::text::menu_template_new);

-- 5. Drop de l'ancien type + rename du nouveau
DROP TYPE menu_template;
ALTER TYPE menu_template_new RENAME TO menu_template;

-- 6. Restaurer le DEFAULT (NOT NULL conservé par l'ALTER TYPE)
ALTER TABLE menus ALTER COLUMN template SET DEFAULT 'CLASSIC';

COMMIT;
