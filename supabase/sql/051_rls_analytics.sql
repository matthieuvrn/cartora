-- Row-Level Security for analytics tables.
-- Same pattern as 021_rls_child_tables.sql: uses my_restaurant_id() helper.
-- Prisma queries use service role (bypass RLS), but RLS is a safety net
-- against direct access from client-side or anon contexts.

-- ── menu_view_events ────────────────────────────────────────────────

ALTER TABLE menu_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_view_events_select_own" ON menu_view_events
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "menu_view_events_insert_own" ON menu_view_events
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

-- ── menu_view_daily_stats ───────────────────────────────────────────

ALTER TABLE menu_view_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_view_daily_stats_select_own" ON menu_view_daily_stats
  FOR SELECT USING (restaurant_id = my_restaurant_id());

CREATE POLICY "menu_view_daily_stats_insert_own" ON menu_view_daily_stats
  FOR INSERT WITH CHECK (restaurant_id = my_restaurant_id());

CREATE POLICY "menu_view_daily_stats_update_own" ON menu_view_daily_stats
  FOR UPDATE USING (restaurant_id = my_restaurant_id())
  WITH CHECK (restaurant_id = my_restaurant_id());
