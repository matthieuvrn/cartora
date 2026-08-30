-- Cartora — Durable DeepL usage ledger (anti-abuse budget for auto-translation).
-- One row per (restaurant, Paris calendar day); `calls`/`chars` are incremented
-- atomically by the app BEFORE each DeepL request. Read by TranslationBudgetPolicy
-- to enforce per-restaurant daily caps + a global monthly char budget — the durable
-- guard behind the (in-memory-on-Vercel) action rate limiter.

CREATE TABLE translation_usage (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    day DATE NOT NULL,
    calls INTEGER NOT NULL DEFAULT 0,
    chars INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT translation_usage_pkey PRIMARY KEY (id),
    CONSTRAINT translation_usage_restaurant_id_fkey
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX translation_usage_restaurant_id_day_key
  ON translation_usage(restaurant_id, day);

-- Backs the global monthly SUM(chars) WHERE day >= month start.
CREATE INDEX translation_usage_day_idx ON translation_usage(day);

-- RLS enabled with no policies = deny all for anon/authenticated.
-- Prisma (postgres role, table owner) is the only writer/reader.
ALTER TABLE translation_usage ENABLE ROW LEVEL SECURITY;

-- ─── Purge rows older than 13 months (weekly, Sunday 04:00 UTC) ─────────────
-- The budget only ever reads the current month; 13 months kept for offline
-- cost analysis, then dropped (minimisation).
SELECT cron.schedule(
  'purge-old-translation-usage',
  '0 4 * * 0',
  $$DELETE FROM translation_usage
    WHERE day < NOW() - INTERVAL '13 months'
    AND ctid IN (
      SELECT ctid FROM translation_usage
      WHERE day < NOW() - INTERVAL '13 months'
      LIMIT 10000
    )$$
);
