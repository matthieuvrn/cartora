-- Ajoute les 14 allergènes UE (règlement INCO 1169/2011, annexe II) aux items.
-- Non destructif : tous les items existants reçoivent un tableau vide par défaut.

CREATE TYPE allergen AS ENUM (
  'GLUTEN',
  'CRUSTACEANS',
  'EGGS',
  'FISH',
  'PEANUTS',
  'SOYBEANS',
  'MILK',
  'NUTS',
  'CELERY',
  'MUSTARD',
  'SESAME',
  'SULPHITES',
  'LUPIN',
  'MOLLUSCS'
);

ALTER TABLE items
  ADD COLUMN allergens allergen[] NOT NULL DEFAULT '{}'::allergen[];
