-- Catégories personnalisables : remplace l'enum fixe CategoryType par un nom libre.
-- Backfill FR pour les catégories existantes + backfill des snapshots publics.
--
-- À exécuter dans Supabase SQL Editor.

-- 1. Ajouter la colonne name + backfill FR à partir de l'enum existant.
ALTER TABLE categories ADD COLUMN name TEXT;

UPDATE categories SET name = CASE type
  WHEN 'STARTERS' THEN 'Entrées'
  WHEN 'MAINS'    THEN 'Plats'
  WHEN 'DESSERTS' THEN 'Desserts'
  WHEN 'DRINKS'   THEN 'Boissons'
END;

ALTER TABLE categories ALTER COLUMN name SET NOT NULL;
ALTER TABLE categories ALTER COLUMN name TYPE VARCHAR(50);

-- 2. Drop l'ancienne unicité (menu_id, type), drop la colonne type, drop l'enum.
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_menu_id_type_key;
ALTER TABLE categories DROP COLUMN type;
DROP TYPE category_type;

-- 3. Unicité du nom de catégorie par menu, insensible à la casse + trim.
CREATE UNIQUE INDEX categories_menu_id_name_lower_idx
  ON categories (menu_id, lower(btrim(name)));

-- 4. Backfill des snapshots publics : remplace {type: "STARTERS"} par {name: "Entrées"} dans
--    snapshot_data.categories[]. Sans ça, les menus déjà publiés affichent du blanc.
UPDATE menu_public_snapshots
SET snapshot_data = jsonb_set(
  snapshot_data,
  '{categories}',
  COALESCE(
    (
      SELECT jsonb_agg(
        (cat - 'type') || jsonb_build_object('name',
          CASE cat->>'type'
            WHEN 'STARTERS' THEN 'Entrées'
            WHEN 'MAINS'    THEN 'Plats'
            WHEN 'DESSERTS' THEN 'Desserts'
            WHEN 'DRINKS'   THEN 'Boissons'
            ELSE cat->>'type'
          END
        )
        ORDER BY ord
      )
      FROM jsonb_array_elements(snapshot_data->'categories') WITH ORDINALITY AS t(cat, ord)
    ),
    '[]'::jsonb
  )
)
WHERE snapshot_data ? 'categories';
