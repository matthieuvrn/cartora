-- Cartora — Landing page tracking events (anonymous, no FK to restaurants)
-- Purgé après 30 jours via pg_cron. RLS: INSERT autorisé à anon/authenticated,
-- SELECT réservé au service_role (pas de policy SELECT pour les autres rôles).
--
-- Généré via:
--   prisma migrate diff --from-schema <pre-edit> --to-schema prisma/schema.prisma --script
-- (avec ajout manuel des sections RLS + pg_cron à la fin)

-- CreateTable
CREATE TABLE "landing_events" (
    "id" UUID NOT NULL,
    "event_name" VARCHAR(64) NOT NULL,
    "locale" "locale" NOT NULL,
    "device_type" "device_type" NOT NULL,
    "source" VARCHAR(32),
    "metadata" JSONB,
    "user_agent" VARCHAR(500),
    "referer" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_events_event_name_created_at_idx" ON "landing_events"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "landing_events_created_at_idx" ON "landing_events"("created_at");

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Insertion autorisée à anon/authenticated (visiteurs landing).
-- Aucune policy SELECT/UPDATE/DELETE pour anon/authenticated → seul le
-- service_role peut lire (analyse via Supabase Studio ou SQL custom côté admin).

ALTER TABLE "landing_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_events_insert_anon" ON "landing_events"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── Purge automatique 30 jours via pg_cron ──────────────────────────────────
-- Aligné sur 054_analytics_events_purge.sql (menu_view_events).
-- L'extension pg_cron est déjà activée (cf. 054_).

SELECT cron.schedule(
  'purge_landing_events_30d',
  '15 3 * * *',
  $$DELETE FROM landing_events WHERE created_at < now() - interval '30 days'$$
);
