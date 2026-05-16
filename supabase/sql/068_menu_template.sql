-- 068: Add menu_template enum + column on menus
-- Permet de choisir parmi 3 designs (CLASSIC / ELEGANT / MODERN) pour le rendu public.
-- ELEGANT et MODERN sont gatés PRO (PlanPolicy.canUseTemplate). CLASSIC reste le défaut.
-- Les snapshots existants sans `template` retombent sur CLASSIC côté lecture (champ optionnel
-- dans PublicMenuSnapshot). Pas de backfill nécessaire — DEFAULT couvre les rangs existants.

-- 1. Enum
CREATE TYPE menu_template AS ENUM ('CLASSIC', 'ELEGANT', 'MODERN');

-- 2. Colonne sur menus (NOT NULL avec default CLASSIC — backfill implicite)
ALTER TABLE menus
  ADD COLUMN template menu_template NOT NULL DEFAULT 'CLASSIC';
