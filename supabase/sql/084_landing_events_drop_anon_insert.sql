-- 084 — landing_events : suppression de la policy INSERT anon.
--
-- La policy "landing_events_insert_anon" (073) autorisait anon/authenticated à
-- insérer sans condition. Or TOUTES les garanties du pipeline (rate limit 50/min,
-- anonymisation applicative userAgent→NULL / referer→hostname, event_name borné
-- par Zod) vivent dans /api/track : la voie PostgREST directe, accessible avec la
-- clé anon publique (exposée par design dans le bundle), les contournait toutes —
-- écriture de lignes arbitraires (PII possible dans user_agent/referer/metadata)
-- en volume illimité.
--
-- Les écritures réelles passent par Prisma en service_role (bypass RLS) — même
-- modèle que menu_view_events (051). RLS reste activé ; zéro policy = deny all
-- pour anon/authenticated.

DROP POLICY IF EXISTS "landing_events_insert_anon" ON "landing_events";
