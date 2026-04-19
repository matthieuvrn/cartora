-- Cartora — Automatic purge of stale aggregate stats and webhook events.
-- Raw analytics events are already purged after 30 days (054_analytics_events_purge.sql).
-- This script adds retention policies for two additional tables:
--   - menu_view_daily_stats: 24 months (RGPD minimisation principle)
--   - processed_webhook_events: 90 days (Stripe idempotency no longer needed)

-- ─── Purge daily stats older than 24 months (weekly, Sunday 03:30 UTC) ──────
SELECT cron.schedule(
  'purge-old-daily-stats',
  '30 3 * * 0',
  $$DELETE FROM menu_view_daily_stats
    WHERE date < NOW() - INTERVAL '24 months'
    AND ctid IN (
      SELECT ctid FROM menu_view_daily_stats
      WHERE date < NOW() - INTERVAL '24 months'
      LIMIT 10000
    )$$
);

-- ─── Purge webhook events older than 90 days (weekly, Sunday 03:45 UTC) ─────
SELECT cron.schedule(
  'purge-old-webhook-events',
  '45 3 * * 0',
  $$DELETE FROM processed_webhook_events
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND ctid IN (
      SELECT ctid FROM processed_webhook_events
      WHERE created_at < NOW() - INTERVAL '90 days'
      LIMIT 10000
    )$$
);
