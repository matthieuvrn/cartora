-- ─── Table rase logos (données de test uniquement) ──────────────────────────
-- DESTRUCTIF. Après la refonte « logo compétitif » (crop→WebP carré + rendu
-- object-cover), les anciens logos `.jpg`/`.png` non normalisés rendraient de
-- façon incohérente (recadrage agressif) et le durcissement 081 n'accepte plus
-- que WebP. Aucun restaurant réel en prod → on repart de zéro proprement.
--
-- Le logo persiste à TROIS endroits : la référence live, les snapshots publiés
-- (JSON immuable) et les fichiers du bucket. Ce script nettoie les DEUX premiers
-- (base) — chaque resto retombe sur le monogramme, chaque menu publié perd son logo
-- (le rendu public sans logo = juste le nom).
--
-- ⚠️ Les FICHIERS du bucket ne se suppriment PAS en SQL : Supabase bloque tout DELETE
-- direct sur `storage.objects` (trigger `storage.protect_delete`, erreur 42501). Passer
-- par la Storage API → `pnpm db:purge-logo-files` (service-role) OU vider le bucket
-- depuis le Dashboard (Storage → restaurant-logos → tout sélectionner → Delete).
-- Ordre indifférent : après les 2 UPDATE ci-dessous, plus rien ne référence ces fichiers.

-- 1) Référence live sur l'agrégat Restaurant.
UPDATE restaurants
SET logo_path = NULL
WHERE logo_path IS NOT NULL;

-- 2) Snapshots publiés : retire la clé racine `restaurantLogoPath` du JSON figé
--    (opérateur jsonb `-`). Sans ça, un menu déjà publié afficherait l'ancien logo.
UPDATE menu_public_snapshots
SET snapshot_data = snapshot_data - 'restaurantLogoPath'
WHERE snapshot_data ? 'restaurantLogoPath';
