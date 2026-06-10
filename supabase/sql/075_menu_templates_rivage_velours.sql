-- 075: Ajoute 2 templates premium (RIVAGE, VELOURS) au set public (set 2026.1).
--   RIVAGE  → bord de mer / méditerranéen (light froid : marine / écume / sablé)
--   VELOURS → bar à vin / speakeasy (dark chaud : aubergine / rosé poudré / cuivre)
--
-- Additif pur → `ADD VALUE IF NOT EXISTS` (idempotent, rejouable). Contrairement à 074
-- (qui RETIRAIT des valeurs → recreate complet du type), on ne fait qu'AJOUTER :
-- pas de recreate, pas de remap, pas de réécriture des snapshots JSON. Le renderer
-- retombe déjà sur CLASSIC pour toute valeur inconnue (cf. MenuTemplateRenderer /
-- `requested in TEMPLATE_REGISTRY`), donc aucun filet supplémentaire requis.
--
-- Pas de transaction explicite : chaque `ALTER TYPE ... ADD VALUE` s'auto-commit ;
-- `IF NOT EXISTS` garantit l'idempotence (un 2e passage ne plante pas).
-- À appliquer manuellement dans le Supabase SQL Editor.

ALTER TYPE menu_template ADD VALUE IF NOT EXISTS 'RIVAGE';
ALTER TYPE menu_template ADD VALUE IF NOT EXISTS 'VELOURS';
