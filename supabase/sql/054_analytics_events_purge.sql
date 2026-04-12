-- Cartora — Purge automatique des événements analytics bruts.
-- Les données sont agrégées dans menu_view_daily_stats, les événements
-- bruts de +30 jours ne servent plus. On les purge chaque nuit via pg_cron.

-- ─── Extension pg_cron ──────────────────────────────────────────────────
-- pg_cron est pré-installé sur Supabase, il suffit de l'activer.
-- Les jobs pg_cron s'exécutent avec les droits du superuser (postgres).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Job de purge ───────────────────────────────────────────────────────
-- Chaque nuit à 03:00 UTC, supprime les événements de +30 jours.
-- On utilise une suppression par batch (LIMIT 10000) pour ne pas verrouiller
-- la table trop longtemps en cas de gros volume initial.
SELECT cron.schedule(
  'purge-old-view-events',
  '0 3 * * *',
  $$DELETE FROM menu_view_events WHERE created_at < NOW() - INTERVAL '30 days' AND ctid IN (SELECT ctid FROM menu_view_events WHERE created_at < NOW() - INTERVAL '30 days' LIMIT 10000)$$
);
