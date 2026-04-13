-- Empêche qu'un item référence une catégorie d'un autre restaurant.
-- Pré-requis : vérifier qu'aucune donnée incohérente n'existe avant d'appliquer :
--   SELECT i.id FROM items i JOIN categories c ON c.id = i.category_id
--   WHERE i.restaurant_id != c.restaurant_id;

-- Composite unique sur categories (nécessaire comme cible de la FK composite)
ALTER TABLE categories
  ADD CONSTRAINT categories_id_restaurant_id_key UNIQUE (id, restaurant_id);

-- FK composite sur items → (category_id, restaurant_id) doit exister dans categories
ALTER TABLE items
  ADD CONSTRAINT items_category_restaurant_fk
  FOREIGN KEY (category_id, restaurant_id)
  REFERENCES categories (id, restaurant_id)
  ON DELETE CASCADE;
