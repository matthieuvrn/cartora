-- 085 — enum "locale" : ajout ES / DE / IT.
--
-- La dimension « langue » des analytics tracke désormais la langue de LECTURE du
-- menu (état du switcher S4, MenuLocale fr|en|es|de|it), et non plus la locale
-- chrome fr/en. L'enum Postgres partagé par menu_view_events,
-- menu_view_daily_stats et landing_events doit donc couvrir les 5 valeurs.
--
-- ⚠️ À APPLIQUER AVANT de déployer le code qui écrit ES/DE/IT (sinon erreur
-- d'enum à l'insertion d'une vue en es/de/it).
--
-- Note : ALTER TYPE ... ADD VALUE est accepté en transaction depuis PostgreSQL 12,
-- mais la nouvelle valeur n'est utilisable qu'après COMMIT — exécuter ce fichier
-- seul dans le SQL Editor.

ALTER TYPE "locale" ADD VALUE IF NOT EXISTS 'ES';
ALTER TYPE "locale" ADD VALUE IF NOT EXISTS 'DE';
ALTER TYPE "locale" ADD VALUE IF NOT EXISTS 'IT';
