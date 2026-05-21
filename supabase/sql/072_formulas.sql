-- S3.2 — Formules de menu.
-- Table autonome (pas de FK vers items) qui représente une formule à prix forfaitaire
-- avec composition libre multi-ligne (descriptionFr/En) et expiration obligatoire.
-- Affichée dans la section "Aujourd'hui" du menu public, à côté des plats du jour S3.1.
-- La lecture publique filtre par `valid_until > now()` côté application (snapshot
-- immuable, rendu dynamique). Gating tier (STARTER+) appliqué au use case via
-- PlanPolicy.canUseFormulas.

CREATE TABLE IF NOT EXISTS formulas (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID         NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_id         UUID         NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name_fr         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100) NOT NULL DEFAULT '',
  description_fr  VARCHAR(500) NOT NULL DEFAULT '',
  description_en  VARCHAR(500) NOT NULL DEFAULT '',
  price_cents     INTEGER      NOT NULL CHECK (price_cents >= 0 AND price_cents <= 99999),
  valid_until     TIMESTAMPTZ  NOT NULL,
  "order"         INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS formulas_menu_valid_until_idx
  ON formulas (menu_id, valid_until);

CREATE INDEX IF NOT EXISTS formulas_restaurant_idx
  ON formulas (restaurant_id);

-- RLS : isolation multi-tenant via le helper my_restaurant_id() (cf. 021_rls_child_tables.sql).
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "formulas_select_own" ON formulas
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "formulas_insert_own" ON formulas
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "formulas_update_own" ON formulas
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "formulas_delete_own" ON formulas
  FOR DELETE USING (restaurant_id = my_restaurant_id());
