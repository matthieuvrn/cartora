-- S3.1 — Menu du jour avec expiration auto.
-- Table autonome (pas de FK vers items) qui représente un plat exclusif au jour,
-- avec expiration obligatoire. La lecture publique filtre par `valid_until > now()`
-- côté application (le snapshot publié reste immuable, le rendu est dynamique).
-- Gating tier (STARTER+) appliqué au niveau use case (PlanPolicy.canUseDailyMenu).

CREATE TABLE IF NOT EXISTS daily_menu_entries (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID         NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_id         UUID         NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name_fr         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100) NOT NULL DEFAULT '',
  description_fr  VARCHAR(500) NOT NULL DEFAULT '',
  description_en  VARCHAR(500) NOT NULL DEFAULT '',
  price_cents     INTEGER      NOT NULL CHECK (price_cents >= 0 AND price_cents <= 99999),
  badge           item_badge   NOT NULL DEFAULT 'NONE',
  allergens       allergen[]   NOT NULL DEFAULT '{}',
  image_path      TEXT,
  alt_text_fr     TEXT,
  alt_text_en     TEXT,
  valid_until     TIMESTAMPTZ  NOT NULL,
  "order"         INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_menu_entries_menu_valid_until_idx
  ON daily_menu_entries (menu_id, valid_until);

CREATE INDEX IF NOT EXISTS daily_menu_entries_restaurant_idx
  ON daily_menu_entries (restaurant_id);

-- RLS : isolation multi-tenant via le helper my_restaurant_id() (cf. 021_rls_child_tables.sql).
ALTER TABLE daily_menu_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_menu_entries_select_own" ON daily_menu_entries
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "daily_menu_entries_insert_own" ON daily_menu_entries
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "daily_menu_entries_update_own" ON daily_menu_entries
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "daily_menu_entries_delete_own" ON daily_menu_entries
  FOR DELETE USING (restaurant_id = my_restaurant_id());
