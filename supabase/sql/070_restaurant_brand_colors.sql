-- ─── Couleurs personnalisables (S2.4) ─────────────────────────────────────
-- 3 colonnes hex `#RRGGBB` sur restaurants : primary (titres, badges, accents),
-- accent (prix, décorations secondaires) et background (fond du template).
-- Toutes nullables : NULL = utiliser les couleurs par défaut du template choisi.
-- Gating tier PRO appliqué côté domain (PlanPolicy.canUseBranding) — la DB
-- accepte techniquement n'importe quelle valeur hex, le filtrage tier se fait
-- au moment de l'update via le use case.
--
-- Format validé via CHECK : strict `#` + 6 hex chars (lowercase ou uppercase).
-- Stocker hex plutôt qu'OKLCH (le projet utilise OKLCH dans globals.css) pour
-- simplifier la saisie utilisateur — conversion à l'affichage si besoin.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS brand_primary VARCHAR(7),
  ADD COLUMN IF NOT EXISTS brand_accent VARCHAR(7),
  ADD COLUMN IF NOT EXISTS brand_background VARCHAR(7);

ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_brand_primary_hex_chk
    CHECK (brand_primary IS NULL OR brand_primary ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT restaurants_brand_accent_hex_chk
    CHECK (brand_accent IS NULL OR brand_accent ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT restaurants_brand_background_hex_chk
    CHECK (brand_background IS NULL OR brand_background ~ '^#[0-9a-fA-F]{6}$');
