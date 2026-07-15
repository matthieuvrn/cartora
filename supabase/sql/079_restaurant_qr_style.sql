-- ─── Personnalisation du QR code (page Partage) ──────────────────────────────
-- Colonne JSONB `qr_style` sur restaurants : { darkColor, lightColor, dotsStyle,
-- cornersStyle }. NULL = look par défaut (noir/blanc, modules carrés) — identique
-- au QR historique, donc zéro régression pour l'existant.
--
-- Découplée du template et des couleurs de marque (décision produit 2026). Le QR est
-- rendu 100 % côté navigateur (qr-code-styling) ; cette colonne ne stocke que le style.
--
-- PAS de CHECK DB (contrairement aux colonnes brand_* hex) : la forme et les invariants
-- de scannabilité (contraste, code non inversé, styles bornés) sont validés par
-- `QrStylePolicy` au moment de l'écriture — l'application est le seul writer, cohérent
-- avec les colonnes String CHECK-less des tables translations.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS qr_style JSONB;
