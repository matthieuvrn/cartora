-- Auto-update updated_at on every UPDATE.
-- Covers all tables that have an updated_at column.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- restaurants
CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON "restaurants"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- menus
CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON "menus"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- categories
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON "categories"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- items
CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON "items"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- translations
CREATE TRIGGER trg_translations_updated_at
  BEFORE UPDATE ON "translations"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- billing
CREATE TRIGGER trg_billing_updated_at
  BEFORE UPDATE ON "billing"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- qr_assets
CREATE TRIGGER trg_qr_assets_updated_at
  BEFORE UPDATE ON "qr_assets"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
