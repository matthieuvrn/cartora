-- Cartora — Automatic purge of raw analytics events.
-- Data is aggregated in menu_view_daily_stats; raw events older than
-- 30 days are no longer needed. We purge them nightly via pg_cron.

-- ─── Extension pg_cron ──────────────────────────────────────────────────
-- pg_cron is pre-installed on Supabase, just needs to be enabled.
-- pg_cron jobs run with superuser (postgres) privileges.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Job de purge ───────────────────────────────────────────────────────
-- Every night at 03:00 UTC, delete events older than 30 days.
-- Uses batch deletion (LIMIT 10000) to avoid locking the table
-- too long in case of a large initial volume.
SELECT cron.schedule(
  'purge-old-view-events',
  '0 3 * * *',
  $$DELETE FROM menu_view_events WHERE created_at < NOW() - INTERVAL '30 days' AND ctid IN (SELECT ctid FROM menu_view_events WHERE created_at < NOW() - INTERVAL '30 days' LIMIT 10000)$$
);
