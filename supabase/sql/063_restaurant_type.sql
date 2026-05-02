-- Ajoute le type d'établissement sur les restaurants (S1.2 onboarding).
-- Nullable : NULL = "n'a pas répondu", distinct de TRADITIONAL = "a explicitement choisi traditional".
-- Non destructif : les comptes existants conservent NULL et leurs catégories actuelles.

CREATE TYPE restaurant_type AS ENUM (
  'TRADITIONAL',
  'PIZZERIA',
  'BRASSERIE',
  'BAR',
  'CAFE',
  'CREPERIE',
  'FASTFOOD',
  'BAKERY'
);

ALTER TABLE restaurants
  ADD COLUMN restaurant_type restaurant_type;
