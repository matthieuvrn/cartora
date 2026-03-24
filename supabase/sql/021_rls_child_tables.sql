-- RLS policies for all child tables (multi-tenant isolation).
-- Uses a SECURITY DEFINER helper so ownership logic lives in ONE place.
--
-- restaurants keeps its own direct policy (owner_user_id = auth.uid()).
-- All other tables delegate to my_restaurant_id().

-- ─── Helper function ──────────────────────────────────────────────────────────
-- SECURITY DEFINER  → runs as DB owner, bypasses RLS on restaurants (no recursion)
-- STABLE            → result cached for the duration of the SQL statement
CREATE OR REPLACE FUNCTION my_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
$$;

-- ─── menus ────────────────────────────────────────────────────────────────────
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menus_select_own" ON menus
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "menus_insert_own" ON menus
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "menus_update_own" ON menus
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "menus_delete_own" ON menus
  FOR DELETE USING (restaurant_id = my_restaurant_id());

-- ─── categories ───────────────────────────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_own" ON categories
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "categories_insert_own" ON categories
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "categories_update_own" ON categories
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "categories_delete_own" ON categories
  FOR DELETE USING (restaurant_id = my_restaurant_id());

-- ─── items ────────────────────────────────────────────────────────────────────
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_select_own" ON items
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "items_insert_own" ON items
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "items_update_own" ON items
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "items_delete_own" ON items
  FOR DELETE USING (restaurant_id = my_restaurant_id());

-- ─── translations ─────────────────────────────────────────────────────────────
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translations_select_own" ON translations
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "translations_insert_own" ON translations
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "translations_update_own" ON translations
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "translations_delete_own" ON translations
  FOR DELETE USING (restaurant_id = my_restaurant_id());

-- ─── billing ──────────────────────────────────────────────────────────────────
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_select_own" ON billing
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "billing_insert_own" ON billing
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "billing_update_own" ON billing
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "billing_delete_own" ON billing
  FOR DELETE USING (restaurant_id = my_restaurant_id());

-- ─── qr_assets ────────────────────────────────────────────────────────────────
ALTER TABLE qr_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_assets_select_own" ON qr_assets
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "qr_assets_insert_own" ON qr_assets
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "qr_assets_update_own" ON qr_assets
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "qr_assets_delete_own" ON qr_assets
  FOR DELETE USING (restaurant_id = my_restaurant_id());

-- ─── menu_public_snapshots ────────────────────────────────────────────────────
ALTER TABLE menu_public_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select_own" ON menu_public_snapshots
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "snapshots_insert_own" ON menu_public_snapshots
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "snapshots_delete_own" ON menu_public_snapshots
  FOR DELETE USING (restaurant_id = my_restaurant_id());
