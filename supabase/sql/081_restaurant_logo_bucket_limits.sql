-- ─── Durcissement bucket restaurant-logos (limites serveur) ──────────────────
-- Le bucket (migration 069) était créé sans plafond : tous les contrôles de taille
-- et de type étaient client-only, donc contournables via la signed upload URL
-- (`upsert:true`, Content-Type posé par le navigateur). On pose la vraie barrière
-- côté serveur.
--
-- Depuis la refonte « logo compétitif », l'upload est TOUJOURS recadré + downscalé
-- à 512×512 puis ré-encodé en WebP côté client avant le PUT → on n'accepte plus
-- qu'`image/webp` (gate le plus strict), plafonné à 2 Mo (aligné MAX_LOGO_SIZE_BYTES).
--
-- Non destructif : la policy SELECT publique n'est pas touchée → les anciens objets
-- `.jpg`/`.png` déjà stockés restent lisibles. Un ré-upload produit un `.webp` et
-- `SetRestaurantLogo` supprime l'orphelin à l'ancienne extension.
--
-- ⚠️ Complément : `082_purge_existing_logos.sql` fait ensuite table rase des anciens
-- logos de test (référence live + snapshots publiés + bucket) pour ne rien laisser
-- dans un état incohérent avec le nouveau pipeline WebP carré.

UPDATE storage.buckets
SET file_size_limit    = 2097152,               -- 2 Mo
    allowed_mime_types = ARRAY['image/webp']
WHERE id = 'restaurant-logos';
