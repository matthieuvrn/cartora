-- ─── Suppression du pipeline QR serveur (place nette) ────────────────────────
-- Le QR est désormais rendu 100 % côté navigateur (qr-code-styling) depuis le style
-- `restaurants.qr_style` (migration 079). L'ancien PNG généré au serveur et stocké
-- devient inutile : on retire la table + la dépendance `qrcode`.
--
-- DESTRUCTIF : supprime la table `qr_assets` (les chemins de PNG stockés). Aucune
-- donnée métier perdue — le QR se régénère à la volée depuis l'URL du menu.
--
-- ⚠️ À FAIRE AUSSI (hors SQL) : supprimer le bucket Supabase Storage `qr-codes`
-- (Dashboard Storage → bucket `qr-codes` → Delete), il n'est plus référencé nulle part.

DROP TABLE IF EXISTS qr_assets;
